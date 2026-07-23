import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupMember } from '../group-members/entities/group-member.entity';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  let service: GroupsService;

  const groupCreateMock = jest.fn();
  const groupSaveMock = jest.fn();
  const userFindOneMock = jest.fn();
  const groupMemberCreateMock = jest.fn();
  const groupMemberSaveMock = jest.fn();

  beforeEach(async () => {
    groupCreateMock.mockReset();
    groupSaveMock.mockReset();
    userFindOneMock.mockReset();
    groupMemberCreateMock.mockReset();
    groupMemberSaveMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getRepositoryToken(Group),
          useValue: {
            create: groupCreateMock,
            save: groupSaveMock,
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: userFindOneMock,
          },
        },
        {
          provide: getRepositoryToken(GroupMember),
          useValue: {
            create: groupMemberCreateMock,
            save: groupMemberSaveMock,
          },
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a group and a creator membership', async () => {
    const creator = { id: 1 } as User;
    const createdGroup = {
      id: 10,
      name: 'Goa Trip',
      description: 'Trip with friends',
    } as Group;

    userFindOneMock.mockResolvedValue(creator);
    groupCreateMock.mockReturnValue(createdGroup);
    groupSaveMock.mockResolvedValue(createdGroup);
    groupMemberCreateMock.mockReturnValue({});
    groupMemberSaveMock.mockResolvedValue({});

    const result = await service.create(
      { name: 'Goa Trip', description: 'Trip with friends' },
      1,
    );

    expect(userFindOneMock).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(groupCreateMock).toHaveBeenCalledWith({
      name: 'Goa Trip',
      description: 'Trip with friends',
      creator,
    });
    expect(groupSaveMock).toHaveBeenCalled();
    expect(groupMemberCreateMock).toHaveBeenCalledWith({
      group: createdGroup,
      user: creator,
    });
    expect(groupMemberSaveMock).toHaveBeenCalled();
    expect(result).toEqual(createdGroup);
  });
});
