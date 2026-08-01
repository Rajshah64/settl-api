import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settlement } from './entities/settlement.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupMembersService } from '../group-members/group-members.service';
import { GroupRole, hasMinRole } from '../group-members/enums/group-role.enum';
import { CreateSettlementDto } from './dto/create-settlement.dto';

export interface SettlementBalanceInput {
  fromUserId: number;
  toUserId: number;
  amountPaise: number;
}

@Injectable()
export class SettlementsService {
  constructor(
    @InjectRepository(Settlement)
    private readonly settlementRepository: Repository<Settlement>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly groupMembersService: GroupMembersService,
  ) {}

  /**
   * Soft-deleted settlements are excluded by TypeORM default.
   * Used by balance derivation.
   */
  async listForBalances(groupId: number): Promise<SettlementBalanceInput[]> {
    const rows = await this.settlementRepository.find({
      where: { group: { id: groupId } },
      relations: { fromUser: true, toUser: true },
    });

    return rows.map((s) => ({
      fromUserId: s.fromUser.id,
      toUserId: s.toUser.id,
      amountPaise: Number(s.amountPaise),
    }));
  }

  async list(groupId: number, actorUserId: number): Promise<Settlement[]> {
    await this.groupMembersService.assertMember(groupId, actorUserId);

    return this.settlementRepository.find({
      where: { group: { id: groupId } },
      relations: {
        fromUser: true,
        toUser: true,
        createdBy: true,
      },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  async create(
    groupId: number,
    actorUserId: number,
    dto: CreateSettlementDto,
  ): Promise<Settlement> {
    const membership = await this.groupMembersService.assertMember(
      groupId,
      actorUserId,
    );

    if (dto.fromUserId === dto.toUserId) {
      throw new BadRequestException('fromUserId and toUserId must differ');
    }

    const isParty =
      actorUserId === dto.fromUserId || actorUserId === dto.toUserId;
    const isAdminOrAbove = hasMinRole(membership.role, GroupRole.ADMIN);
    if (!isParty && !isAdminOrAbove) {
      throw new ForbiddenException(
        'Only a party to the settlement or a group admin/owner can record it',
      );
    }

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    const fromMembership = await this.groupMembersService.findMembership(
      groupId,
      dto.fromUserId,
    );
    if (!fromMembership) {
      throw new BadRequestException(
        `User ${dto.fromUserId} is not a member of this group`,
      );
    }

    const toMembership = await this.groupMembersService.findMembership(
      groupId,
      dto.toUserId,
    );
    if (!toMembership) {
      throw new BadRequestException(
        `User ${dto.toUserId} is not a member of this group`,
      );
    }

    const [fromUser, toUser, createdBy] = await Promise.all([
      this.userRepository.findOne({ where: { id: dto.fromUserId } }),
      this.userRepository.findOne({ where: { id: dto.toUserId } }),
      this.userRepository.findOne({ where: { id: actorUserId } }),
    ]);

    if (!fromUser || !toUser || !createdBy) {
      throw new NotFoundException('One or more users were not found');
    }

    const settlement = this.settlementRepository.create({
      group,
      fromUser,
      toUser,
      amountPaise: String(dto.amountPaise),
      currency: 'INR',
      note: dto.note?.trim() || null,
      createdBy,
    });

    const saved = await this.settlementRepository.save(settlement);

    return this.settlementRepository.findOneOrFail({
      where: { id: saved.id },
      relations: {
        fromUser: true,
        toUser: true,
        createdBy: true,
        group: true,
      },
    });
  }

  async softDelete(
    groupId: number,
    settlementId: number,
    actorUserId: number,
  ): Promise<void> {
    const membership = await this.groupMembersService.assertMember(
      groupId,
      actorUserId,
    );

    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId, group: { id: groupId } },
      relations: {
        fromUser: true,
        toUser: true,
        createdBy: true,
      },
    });

    if (!settlement) {
      throw new NotFoundException(
        `Settlement with id ${settlementId} not found`,
      );
    }

    const isParty =
      actorUserId === settlement.fromUser.id ||
      actorUserId === settlement.toUser.id ||
      actorUserId === settlement.createdBy.id;
    const isAdminOrAbove = hasMinRole(membership.role, GroupRole.ADMIN);

    if (!isParty && !isAdminOrAbove) {
      throw new ForbiddenException(
        'Only a party, the recorder, or a group admin/owner can undo this settlement',
      );
    }

    await this.settlementRepository.softDelete(settlement.id);
  }
}
