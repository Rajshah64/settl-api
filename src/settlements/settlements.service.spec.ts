import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { Settlement } from './entities/settlement.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupMembersService } from '../group-members/group-members.service';
import { GroupRole } from '../group-members/enums/group-role.enum';

describe('SettlementsService', () => {
  let service: SettlementsService;

  const settlementRepositoryMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };
  const groupRepositoryMock = { findOne: jest.fn() };
  const userRepositoryMock = { findOne: jest.fn() };
  const groupMembersServiceMock = {
    assertMember: jest.fn(),
    findMembership: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementsService,
        {
          provide: getRepositoryToken(Settlement),
          useValue: settlementRepositoryMock,
        },
        { provide: getRepositoryToken(Group), useValue: groupRepositoryMock },
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
        { provide: GroupMembersService, useValue: groupMembersServiceMock },
      ],
    }).compile();

    service = module.get(SettlementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects same from and to user', async () => {
    groupMembersServiceMock.assertMember.mockResolvedValue({
      role: GroupRole.MEMBER,
    });

    await expect(
      service.create(1, 2, {
        fromUserId: 2,
        toUserId: 2,
        amountPaise: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forbids a non-party non-admin from recording', async () => {
    groupMembersServiceMock.assertMember.mockResolvedValue({
      role: GroupRole.MEMBER,
    });

    await expect(
      service.create(1, 99, {
        fromUserId: 2,
        toUserId: 3,
        amountPaise: 100,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a settlement when actor is the payer', async () => {
    groupMembersServiceMock.assertMember.mockResolvedValue({
      role: GroupRole.MEMBER,
    });
    groupRepositoryMock.findOne.mockResolvedValue({ id: 1 } as Group);
    groupMembersServiceMock.findMembership.mockResolvedValue({});
    userRepositoryMock.findOne
      .mockResolvedValueOnce({ id: 2 } as User)
      .mockResolvedValueOnce({ id: 3 } as User)
      .mockResolvedValueOnce({ id: 2 } as User);

    const saved = { id: 10, amountPaise: '100' };
    settlementRepositoryMock.create.mockImplementation((data: unknown) => data);
    settlementRepositoryMock.save.mockResolvedValue(saved);
    settlementRepositoryMock.findOneOrFail.mockResolvedValue({
      id: 10,
      amountPaise: '100',
      fromUser: { id: 2 },
      toUser: { id: 3 },
      createdBy: { id: 2 },
    });

    const result = await service.create(1, 2, {
      fromUserId: 2,
      toUserId: 3,
      amountPaise: 100,
    });

    expect(result.id).toBe(10);
    expect(settlementRepositoryMock.save).toHaveBeenCalled();
  });
});
