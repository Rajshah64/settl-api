import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { GroupMember } from './entities/group-member.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupRole, hasMinRole } from './enums/group-role.enum';

@Injectable()
export class GroupMembersService {
  constructor(
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  private members(manager?: EntityManager): Repository<GroupMember> {
    return manager
      ? manager.getRepository(GroupMember)
      : this.groupMemberRepository;
  }

  findMembership(
    groupId: number,
    userId: number,
    manager?: EntityManager,
  ): Promise<GroupMember | null> {
    return this.members(manager).findOne({
      where: {
        group: { id: groupId },
        user: { id: userId },
      },
      relations: { user: true, group: true },
    });
  }

  async assertMember(
    groupId: number,
    userId: number,
    manager?: EntityManager,
  ): Promise<GroupMember> {
    const membership = await this.findMembership(groupId, userId, manager);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }
    return membership;
  }

  async assertMinRole(
    groupId: number,
    userId: number,
    minimum: GroupRole,
    manager?: EntityManager,
  ): Promise<GroupMember> {
    const membership = await this.assertMember(groupId, userId, manager);
    if (!hasMinRole(membership.role, minimum)) {
      throw new ForbiddenException(
        `Requires role ${minimum} or higher (you are ${membership.role})`,
      );
    }
    return membership;
  }

  async listByGroup(groupId: number, requesterId: number): Promise<GroupMember[]> {
    await this.assertMember(groupId, requesterId);

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    return this.groupMemberRepository.find({
      where: { group: { id: groupId } },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });
  }

  /**
   * Used inside group-create transaction. Does not re-check AuthZ —
   * caller is creating the group as the new owner.
   */
  async addOwner(
    group: Group,
    user: User,
    manager: EntityManager,
  ): Promise<GroupMember> {
    const repo = this.members(manager);
    const membership = repo.create({
      group,
      user,
      role: GroupRole.OWNER,
    });
    return repo.save(membership);
  }

  async addMember(
    groupId: number,
    targetUserId: number,
    actorUserId: number,
    role: GroupRole = GroupRole.MEMBER,
  ): Promise<GroupMember> {
    if (role === GroupRole.OWNER) {
      throw new ForbiddenException(
        'Cannot add an OWNER via addMember — use transfer ownership',
      );
    }

    await this.assertMinRole(groupId, actorUserId, GroupRole.ADMIN);

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${targetUserId} not found`);
    }

    const existing = await this.findMembership(groupId, targetUserId);
    if (existing) {
      throw new ConflictException('User is already a member of this group');
    }

    const membership = this.groupMemberRepository.create({
      group,
      user,
      role,
    });

    try {
      return await this.groupMemberRepository.save(membership);
    } catch {
      // Unique(group, user) race — two concurrent adds
      throw new ConflictException('User is already a member of this group');
    }
  }

  /**
   * Join-by-code path: no actor privilege check — invite code is the authz.
   */
  async addMemberByJoin(
    group: Group,
    user: User,
    manager?: EntityManager,
  ): Promise<GroupMember> {
    const repo = this.members(manager);
    const existing = await this.findMembership(group.id, user.id, manager);
    if (existing) {
      return existing;
    }

    const membership = repo.create({
      group,
      user,
      role: GroupRole.MEMBER,
    });
    return repo.save(membership);
  }

  async removeMember(
    groupId: number,
    targetUserId: number,
    actorUserId: number,
  ): Promise<void> {
    if (targetUserId === actorUserId) {
      throw new ForbiddenException('Use leave group to remove yourself');
    }

    const actor = await this.assertMinRole(
      groupId,
      actorUserId,
      GroupRole.ADMIN,
    );
    const target = await this.findMembership(groupId, targetUserId);
    if (!target) {
      throw new NotFoundException('Target user is not a member of this group');
    }

    if (target.role === GroupRole.OWNER) {
      throw new ForbiddenException('Cannot remove the group owner');
    }

    // ADMIN may only remove MEMBER; OWNER may remove ADMIN or MEMBER
    if (
      actor.role === GroupRole.ADMIN &&
      target.role !== GroupRole.MEMBER
    ) {
      throw new ForbiddenException('Admins can only remove members');
    }

    await this.groupMemberRepository.remove(target);
  }

  async leave(groupId: number, userId: number): Promise<void> {
    const membership = await this.assertMember(groupId, userId);

    if (membership.role === GroupRole.OWNER) {
      throw new ForbiddenException(
        'Owner cannot leave — transfer ownership first',
      );
    }

    await this.groupMemberRepository.remove(membership);
  }

  async setRole(
    groupId: number,
    userId: number,
    role: GroupRole,
    manager?: EntityManager,
  ): Promise<GroupMember> {
    const membership = await this.findMembership(groupId, userId, manager);
    if (!membership) {
      throw new NotFoundException('User is not a member of this group');
    }
    membership.role = role;
    return this.members(manager).save(membership);
  }
}
