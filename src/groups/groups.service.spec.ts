import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupMember } from '../group-members/entities/group-member.entity';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepository: Repository<Group>;
  let userRepository: Repository<User>;
  let groupMemberRepository: Repository<GroupMember>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getRepositoryToken(Group),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GroupMember),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    groupMemberRepository = module.get<Repository<GroupMember>>(getRepositoryToken(GroupMember));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a group and a creator membership', async () => {
    const creator = { id: 1 } as User;
    const createdGroup = { id: 10, name: 'Goa Trip', description: 'Trip with friends' } as Group;

    jest.spyOn(userRepository, 'findOne').mockResolvedValue(creator);
    jest.spyOn(groupRepository, 'create').mockReturnValue(createdGroup);
    jest.spyOn(groupRepository, 'save').mockResolvedValue(createdGroup);
    jest.spyOn(groupMemberRepository, 'create').mockReturnValue({} as GroupMember);
    jest.spyOn(groupMemberRepository, 'save').mockResolvedValue({} as GroupMember);

    const result = await service.create({ name: 'Goa Trip', description: 'Trip with friends' }, 1);

    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(groupRepository.create).toHaveBeenCalledWith({
      name: 'Goa Trip',
      description: 'Trip with friends',
      creator,
    });
    expect(groupRepository.save).toHaveBeenCalled();
    expect(groupMemberRepository.create).toHaveBeenCalledWith({
      group: createdGroup,
      user: creator,
    });
    expect(groupMemberRepository.save).toHaveBeenCalled();
    expect(result).toEqual(createdGroup);
  });
});
