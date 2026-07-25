import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Group } from './entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupsService } from './groups.service';
import { GroupMembersService } from '../group-members/group-members.service';
import { GroupRole } from '../group-members/enums/group-role.enum';

describe('GroupsService', () => {
  let service: GroupsService;

  const groupRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
    restore: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const userRepositoryMock = {
    findOne: jest.fn(),
  };

  const groupMembersServiceMock = {
    addOwner: jest.fn(),
    assertMember: jest.fn(),
    assertMinRole: jest.fn(),
    findMembership: jest.fn(),
    setRole: jest.fn(),
    addMemberByJoin: jest.fn(),
    leave: jest.fn(),
  };

  const managerRepoMock = {
    findOne: jest.fn(),
  };

  const managerMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOneOrFail: jest.fn(),
    getRepository: jest.fn(() => managerRepoMock),
  };

  const configServiceMock = {
    get: jest.fn(() => 7),
  };

  const dataSourceMock = {
    transaction: jest.fn(async (cb: (manager: typeof managerMock) => unknown) =>
      cb(managerMock),
    ),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    dataSourceMock.transaction.mockImplementation(
      async (cb: (manager: typeof managerMock) => unknown) => cb(managerMock),
    );
    managerMock.getRepository.mockReturnValue(managerRepoMock);
    managerRepoMock.findOne.mockResolvedValue(null);
    configServiceMock.get.mockReturnValue(7);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(Group), useValue: groupRepositoryMock },
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
        { provide: GroupMembersService, useValue: groupMembersServiceMock },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a group with owner membership inside a transaction', async () => {
    const creator = { id: 1 } as User;
    const savedGroup = {
      id: 10,
      name: 'Goa Trip',
      description: 'Trip with friends',
      inviteCode: 'abc',
    } as Group;
    const hydrated = { ...savedGroup, creator, members: [] } as Group;

    userRepositoryMock.findOne.mockResolvedValue(creator);
    managerMock.create.mockReturnValue(savedGroup);
    managerMock.save.mockResolvedValue(savedGroup);
    managerMock.findOneOrFail.mockResolvedValue(hydrated);
    groupMembersServiceMock.addOwner.mockResolvedValue({});

    const result = await service.create(
      { name: 'Goa Trip', description: 'Trip with friends' },
      1,
    );

    expect(dataSourceMock.transaction).toHaveBeenCalled();
    expect(groupMembersServiceMock.addOwner).toHaveBeenCalledWith(
      savedGroup,
      creator,
      managerMock,
    );
    const createArgs = managerMock.create.mock.calls[0][1] as {
      inviteCode: string;
    };
    expect(createArgs.inviteCode).toMatch(/^\d{6}$/);
    expect(result).toEqual(hydrated);
  });

  it('rejects an expired invite code on join', async () => {
    userRepositoryMock.findOne.mockResolvedValue({ id: 5 } as User);
    groupRepositoryMock.findOne.mockResolvedValue({
      id: 10,
      inviteCode: '123456',
      inviteCodeExpiresAt: new Date(Date.now() - 1000),
    } as Group);

    await expect(service.joinByCode('123456', 5)).rejects.toMatchObject({
      status: 410,
    });
    expect(groupMembersServiceMock.addMemberByJoin).not.toHaveBeenCalled();
  });

  it('requires admin role to update a group', async () => {
    groupMembersServiceMock.assertMinRole.mockResolvedValue({
      role: GroupRole.ADMIN,
    });
    groupRepositoryMock.findOne
      .mockResolvedValueOnce({
        id: 10,
        name: 'Old',
        description: null,
      })
      .mockResolvedValueOnce({
        id: 10,
        name: 'New',
        description: null,
        creator: { id: 1 },
        members: [],
      });
    groupRepositoryMock.save.mockImplementation(async (g: Group) => g);
    groupMembersServiceMock.assertMember.mockResolvedValue({});

    const result = await service.update(10, 1, { name: 'New' });

    expect(groupMembersServiceMock.assertMinRole).toHaveBeenCalledWith(
      10,
      1,
      GroupRole.ADMIN,
    );
    expect(result.name).toBe('New');
  });
});
