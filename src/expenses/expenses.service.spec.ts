import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Expense } from './entities/expense.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupMembersService } from '../group-members/group-members.service';
import { GroupRole } from '../group-members/enums/group-role.enum';

describe('ExpensesService', () => {
  let service: ExpensesService;

  const expenseRepositoryMock = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };
  const groupRepositoryMock = { findOne: jest.fn() };
  const userRepositoryMock = { findOne: jest.fn() };
  const groupMembersServiceMock = {
    assertMember: jest.fn(),
    findMembership: jest.fn(),
  };

  const managerMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOneOrFail: jest.fn(),
    remove: jest.fn(),
  };

  const dataSourceMock = {
    transaction: jest.fn(async (cb: (m: typeof managerMock) => unknown) =>
      cb(managerMock),
    ),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    dataSourceMock.transaction.mockImplementation(
      async (cb: (m: typeof managerMock) => unknown) => cb(managerMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: getRepositoryToken(Expense), useValue: expenseRepositoryMock },
        { provide: getRepositoryToken(Group), useValue: groupRepositoryMock },
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
        { provide: GroupMembersService, useValue: groupMembersServiceMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get(ExpensesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an equal-split expense in a transaction', async () => {
    groupMembersServiceMock.assertMember.mockResolvedValue({
      role: GroupRole.MEMBER,
    });
    groupRepositoryMock.findOne.mockResolvedValue({ id: 10 } as Group);
    groupMembersServiceMock.findMembership.mockResolvedValue({});
    userRepositoryMock.findOne
      .mockResolvedValueOnce({ id: 1 } as User)
      .mockResolvedValueOnce({ id: 1 } as User)
      .mockResolvedValueOnce({ id: 2 } as User);

    const saved = { id: 99, amountPaise: '100' };
    managerMock.create.mockImplementation((_cls: unknown, data: unknown) => data);
    managerMock.save
      .mockResolvedValueOnce(saved)
      .mockResolvedValueOnce([]);
    managerMock.findOneOrFail.mockResolvedValue({
      id: 99,
      amountPaise: '100',
      shares: [
        { user: { id: 1 }, amountPaise: '50' },
        { user: { id: 2 }, amountPaise: '50' },
      ],
    });

    const result = await service.create(10, 1, {
      description: 'Dinner',
      amountPaise: 100,
      paidByUserId: 1,
      participantUserIds: [1, 2],
    });

    expect(dataSourceMock.transaction).toHaveBeenCalled();
    expect(result.id).toBe(99);
    expect(managerMock.save).toHaveBeenCalledTimes(2);
  });

  it('forbids non-payer members from deleting an expense', async () => {
    groupMembersServiceMock.assertMember.mockResolvedValue({
      role: GroupRole.MEMBER,
    });
    expenseRepositoryMock.findOne.mockResolvedValue({
      id: 5,
      paidBy: { id: 1 },
      shares: [],
    });

    await expect(service.softDelete(10, 5, 2)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(expenseRepositoryMock.softDelete).not.toHaveBeenCalled();
  });
});
