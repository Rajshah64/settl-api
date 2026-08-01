import { randomInt } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupMembersService } from '../group-members/group-members.service';
import { GroupRole } from '../group-members/enums/group-role.enum';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly groupMembersService: GroupMembersService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  private inviteTtlDays(): number {
    return Number(this.configService.get('INVITE_CODE_TTL_DAYS') ?? 7);
  }

  private inviteExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + this.inviteTtlDays());
    return expiry;
  }

  /**
   * 6-digit numeric code, globally unique. Retries on collision; the DB unique
   * index is the final backstop. withDeleted:true so soft-deleted groups that
   * still occupy a code are not reused.
   */
  private async generateUniqueInviteCode(
    manager?: EntityManager,
  ): Promise<string> {
    const repo = manager ? manager.getRepository(Group) : this.groupRepository;

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const existing = await repo.findOne({
        where: { inviteCode: code },
        withDeleted: true,
      });
      if (!existing) {
        return code;
      }
    }

    throw new ConflictException(
      'Could not allocate a unique invite code, please retry',
    );
  }

  async create(createGroupDto: CreateGroupDto, userId: number): Promise<Group> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    return this.dataSource.transaction(async (manager) => {
      const group = manager.create(Group, {
        name: createGroupDto.name,
        description: createGroupDto.description ?? null,
        inviteCode: await this.generateUniqueInviteCode(manager),
        inviteCodeExpiresAt: this.inviteExpiry(),
        creator: user,
      });

      const savedGroup = await manager.save(group);
      await this.groupMembersService.addOwner(savedGroup, user, manager);

      return manager.findOneOrFail(Group, {
        where: { id: savedGroup.id },
        relations: { creator: true, members: { user: true } },
      });
    });
  }

  async findMyGroups(userId: number): Promise<Group[]> {
    return this.groupRepository
      .createQueryBuilder('group')
      .innerJoin('group.members', 'membership', 'membership.userId = :userId', {
        userId,
      })
      .leftJoinAndSelect('group.creator', 'creator')
      .orderBy('group.updatedAt', 'DESC')
      .getMany();
  }

  /** Archived groups this user owns (creator), for restore UI. */
  async findMyArchivedGroups(userId: number): Promise<Group[]> {
    return this.groupRepository
      .createQueryBuilder('group')
      .withDeleted()
      .leftJoinAndSelect('group.creator', 'creator')
      .where('group.deletedAt IS NOT NULL')
      .andWhere('group.creatorId = :userId', { userId })
      .orderBy('group.deletedAt', 'DESC')
      .getMany();
  }

  async findOne(groupId: number, userId: number): Promise<Group> {
    await this.groupMembersService.assertMember(groupId, userId);

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: { creator: true, members: { user: true } },
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    return group;
  }

  async update(
    groupId: number,
    userId: number,
    dto: UpdateGroupDto,
  ): Promise<Group> {
    await this.groupMembersService.assertMinRole(
      groupId,
      userId,
      GroupRole.ADMIN,
    );

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    if (dto.name !== undefined) {
      group.name = dto.name;
    }
    if (dto.description !== undefined) {
      group.description = dto.description;
    }

    await this.groupRepository.save(group);
    return this.findOne(groupId, userId);
  }

  async softDelete(groupId: number, userId: number): Promise<void> {
    await this.groupMembersService.assertMinRole(
      groupId,
      userId,
      GroupRole.OWNER,
    );

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    await this.groupRepository.softRemove(group);
  }

  async restore(groupId: number, userId: number): Promise<Group> {
    // withDeleted: membership joins filter soft-deleted groups, so AuthZ here
    // uses creatorId (kept in sync with OWNER role on transfer).
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      withDeleted: true,
      relations: { creator: true },
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    if (!group.deletedAt) {
      throw new ForbiddenException('Group is not archived');
    }

    if (group.creator.id !== userId) {
      throw new ForbiddenException('Only the owner can restore this group');
    }

    await this.groupRepository.restore(groupId);
    return this.findOne(groupId, userId);
  }

  /**
   * Transfer ownership: new owner must already be a member.
   * Old owner demotes to ADMIN. Syncs groups.creatorId with OWNER role.
   */
  async transferOwnership(
    groupId: number,
    actorUserId: number,
    newOwnerUserId: number,
  ): Promise<Group> {
    if (actorUserId === newOwnerUserId) {
      throw new ForbiddenException('You are already the owner');
    }

    await this.groupMembersService.assertMinRole(
      groupId,
      actorUserId,
      GroupRole.OWNER,
    );

    const newOwnerMembership = await this.groupMembersService.findMembership(
      groupId,
      newOwnerUserId,
    );
    if (!newOwnerMembership) {
      throw new NotFoundException(
        'New owner must already be a member of the group',
      );
    }

    const newOwner = await this.userRepository.findOne({
      where: { id: newOwnerUserId },
    });
    if (!newOwner) {
      throw new NotFoundException(`User with id ${newOwnerUserId} not found`);
    }

    await this.dataSource.transaction(async (manager) => {
      await this.groupMembersService.setRole(
        groupId,
        newOwnerUserId,
        GroupRole.OWNER,
        manager,
      );
      await this.groupMembersService.setRole(
        groupId,
        actorUserId,
        GroupRole.ADMIN,
        manager,
      );

      const group = await manager.findOneOrFail(Group, {
        where: { id: groupId },
      });
      group.creator = newOwner;
      await manager.save(group);
    });

    return this.findOne(groupId, actorUserId);
  }

  async joinByCode(code: string, userId: number): Promise<Group> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const group = await this.groupRepository.findOne({
      where: { inviteCode: code },
    });
    if (!group) {
      throw new NotFoundException('Invalid invite code');
    }

    if (
      group.inviteCodeExpiresAt &&
      group.inviteCodeExpiresAt.getTime() < Date.now()
    ) {
      throw new GoneException(
        'This invite code has expired. Ask an admin for a new one.',
      );
    }

    await this.groupMembersService.addMemberByJoin(group, user);
    return this.findOne(group.id, userId);
  }

  /**
   * Rotate the invite code and reset its validity. OWNER/ADMIN only.
   * Old code stops working immediately.
   */
  async regenerateInviteCode(
    groupId: number,
    userId: number,
  ): Promise<{ inviteCode: string; inviteCodeExpiresAt: Date }> {
    await this.groupMembersService.assertMinRole(
      groupId,
      userId,
      GroupRole.ADMIN,
    );

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    group.inviteCode = await this.generateUniqueInviteCode();
    group.inviteCodeExpiresAt = this.inviteExpiry();
    await this.groupRepository.save(group);

    return {
      inviteCode: group.inviteCode,
      inviteCodeExpiresAt: group.inviteCodeExpiresAt,
    };
  }

  async leave(groupId: number, userId: number): Promise<void> {
    await this.groupMembersService.leave(groupId, userId);
  }
}
