import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseShare } from './entities/expense-share.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupMembersService } from '../group-members/group-members.service';
import { GroupRole, hasMinRole } from '../group-members/enums/group-role.enum';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { splitEquallyPaise } from './utils/split-equally';

export interface PaginatedExpenses {
  data: Expense[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly groupMembersService: GroupMembersService,
    private readonly dataSource: DataSource,
  ) {}

  private async assertCanMutateExpense(
    groupId: number,
    actorUserId: number,
    paidByUserId: number,
  ): Promise<void> {
    const membership = await this.groupMembersService.assertMember(
      groupId,
      actorUserId,
    );

    const isPayer = paidByUserId === actorUserId;
    const isAdminOrAbove = hasMinRole(membership.role, GroupRole.ADMIN);

    if (!isPayer && !isAdminOrAbove) {
      throw new ForbiddenException(
        'Only the payer or a group admin/owner can modify this expense',
      );
    }
  }

  private async loadMemberUsers(
    groupId: number,
    userIds: number[],
  ): Promise<Map<number, User>> {
    const uniqueIds = [...new Set(userIds)];
    const map = new Map<number, User>();

    for (const userId of uniqueIds) {
      const membership = await this.groupMembersService.findMembership(
        groupId,
        userId,
      );
      if (!membership) {
        throw new BadRequestException(
          `User ${userId} is not a member of this group`,
        );
      }
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }
      map.set(userId, user);
    }

    return map;
  }

  async create(
    groupId: number,
    actorUserId: number,
    dto: CreateExpenseDto,
  ): Promise<Expense> {
    await this.groupMembersService.assertMember(groupId, actorUserId);

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    const participantIds = [...new Set(dto.participantUserIds)];
    if (participantIds.length < 1) {
      throw new BadRequestException('At least one participant is required');
    }

    const usersById = await this.loadMemberUsers(groupId, [
      dto.paidByUserId,
      ...participantIds,
    ]);
    const payer = usersById.get(dto.paidByUserId)!;
    const participants = participantIds.map((id) => usersById.get(id)!);
    const shareAmounts = splitEquallyPaise(dto.amountPaise, participants.length);

    return this.dataSource.transaction(async (manager) => {
      const expense = manager.create(Expense, {
        description: dto.description,
        amountPaise: String(dto.amountPaise),
        currency: 'INR',
        spentAt: dto.spentAt ? new Date(dto.spentAt) : new Date(),
        group,
        paidBy: payer,
      });

      const savedExpense = await manager.save(expense);

      const shares = participants.map((user, index) =>
        manager.create(ExpenseShare, {
          expense: savedExpense,
          user,
          amountPaise: String(shareAmounts[index]),
        }),
      );
      await manager.save(shares);

      return manager.findOneOrFail(Expense, {
        where: { id: savedExpense.id },
        relations: {
          paidBy: true,
          shares: { user: true },
          group: true,
        },
      });
    });
  }

  async list(
    groupId: number,
    actorUserId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedExpenses> {
    await this.groupMembersService.assertMember(groupId, actorUserId);

    const take = Math.min(Math.max(limit, 1), 50);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * take;

    const [data, total] = await this.expenseRepository.findAndCount({
      where: { group: { id: groupId } },
      relations: { paidBy: true, shares: { user: true } },
      order: { spentAt: 'DESC', id: 'DESC' },
      skip,
      take,
    });

    return {
      data,
      meta: {
        page: currentPage,
        limit: take,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / take),
      },
    };
  }

  async findOne(
    groupId: number,
    expenseId: number,
    actorUserId: number,
  ): Promise<Expense> {
    await this.groupMembersService.assertMember(groupId, actorUserId);

    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId, group: { id: groupId } },
      relations: { paidBy: true, shares: { user: true }, group: true },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with id ${expenseId} not found`);
    }

    return expense;
  }

  async update(
    groupId: number,
    expenseId: number,
    actorUserId: number,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const existing = await this.findOne(groupId, expenseId, actorUserId);
    await this.assertCanMutateExpense(
      groupId,
      actorUserId,
      existing.paidBy.id,
    );

    const nextAmount = dto.amountPaise ?? Number(existing.amountPaise);
    const nextPaidById = dto.paidByUserId ?? existing.paidBy.id;
    const nextParticipantIds =
      dto.participantUserIds ?? existing.shares.map((s) => s.user.id);
    const nextDescription = dto.description ?? existing.description;
    const nextSpentAt = dto.spentAt
      ? new Date(dto.spentAt)
      : existing.spentAt;

    const participantIds = [...new Set(nextParticipantIds)];
    if (participantIds.length < 1) {
      throw new BadRequestException('At least one participant is required');
    }

    const usersById = await this.loadMemberUsers(groupId, [
      nextPaidById,
      ...participantIds,
    ]);
    const payer = usersById.get(nextPaidById)!;
    const participants = participantIds.map((id) => usersById.get(id)!);
    const shareAmounts = splitEquallyPaise(nextAmount, participants.length);

    return this.dataSource.transaction(async (manager) => {
      const expense = await manager.findOneOrFail(Expense, {
        where: { id: expenseId, group: { id: groupId } },
        relations: { shares: true },
      });

      expense.description = nextDescription;
      expense.amountPaise = String(nextAmount);
      expense.paidBy = payer;
      expense.spentAt = nextSpentAt;
      await manager.save(expense);

      if (expense.shares.length > 0) {
        await manager.remove(expense.shares);
      }

      const shares = participants.map((user, index) =>
        manager.create(ExpenseShare, {
          expense,
          user,
          amountPaise: String(shareAmounts[index]),
        }),
      );
      await manager.save(shares);

      return manager.findOneOrFail(Expense, {
        where: { id: expenseId },
        relations: { paidBy: true, shares: { user: true }, group: true },
      });
    });
  }

  async softDelete(
    groupId: number,
    expenseId: number,
    actorUserId: number,
  ): Promise<void> {
    const existing = await this.findOne(groupId, expenseId, actorUserId);
    await this.assertCanMutateExpense(
      groupId,
      actorUserId,
      existing.paidBy.id,
    );

    // softDelete by id avoids cascading soft-remove into share rows
    // (shares have no DeleteDateColumn).
    await this.expenseRepository.softDelete(existing.id);
  }
}
