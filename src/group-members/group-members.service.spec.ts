import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { GroupMembersService } from './group-members.service';
import { GroupMember } from './entities/group-member.entity';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { GroupRole } from './enums/group-role.enum';

describe('GroupMembersService', () => {
  let service: GroupMembersService;

  const memberRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const userRepo = { findOne: jest.fn() };
  const groupRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupMembersService,
        { provide: getRepositoryToken(GroupMember), useValue: memberRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Group), useValue: groupRepo },
      ],
    }).compile();

    service = module.get(GroupMembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('blocks owner from leaving', async () => {
    memberRepo.findOne.mockResolvedValue({
      role: GroupRole.OWNER,
      user: { id: 1 },
    });

    await expect(service.leave(10, 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(memberRepo.remove).not.toHaveBeenCalled();
  });

  it('allows admin to leave', async () => {
    const membership = { role: GroupRole.ADMIN, user: { id: 2 } };
    memberRepo.findOne.mockResolvedValue(membership);
    memberRepo.remove.mockResolvedValue(membership);

    await service.leave(10, 2);

    expect(memberRepo.remove).toHaveBeenCalledWith(membership);
  });

  it('prevents admin from removing another admin', async () => {
    memberRepo.findOne
      .mockResolvedValueOnce({
        role: GroupRole.ADMIN,
        user: { id: 2 },
      })
      .mockResolvedValueOnce({
        role: GroupRole.ADMIN,
        user: { id: 3 },
      });

    await expect(service.removeMember(10, 3, 2)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
