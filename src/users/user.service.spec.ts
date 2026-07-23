import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';

describe('UserService', () => {
  let service: UserService;

  const userRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('loads password via query builder for credential lookups', async () => {
    const getOne = jest.fn().mockResolvedValue({
      id: 1,
      email: 'raj@test.com',
      password: 'hash',
    });
    userRepositoryMock.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne,
    });

    const user = await service.findByEmailWithPassword('raj@test.com');

    expect(userRepositoryMock.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(user).toEqual({
      id: 1,
      email: 'raj@test.com',
      password: 'hash',
    });
  });

  it('updates profile fields', async () => {
    userRepositoryMock.findOneBy.mockResolvedValue({
      id: 1,
      firstName: 'Raj',
      lastName: 'Shah',
    });
    userRepositoryMock.save.mockImplementation(async (user: User) => user);

    const result = await service.updateProfile(1, { firstName: 'Raja' });

    expect(result.firstName).toBe('Raja');
    expect(userRepositoryMock.save).toHaveBeenCalled();
  });

  it('refuses soft-delete when user owns groups', async () => {
    userRepositoryMock.findOne.mockResolvedValue({
      id: 1,
      createdGroups: [{ id: 10 }],
    });

    await expect(service.softDeleteAccount(1)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(userRepositoryMock.softRemove).not.toHaveBeenCalled();
  });

  it('soft-deletes when user owns no groups', async () => {
    const user = { id: 1, createdGroups: [] };
    userRepositoryMock.findOne.mockResolvedValue(user);
    userRepositoryMock.softRemove.mockResolvedValue(user);

    await service.softDeleteAccount(1);

    expect(userRepositoryMock.softRemove).toHaveBeenCalledWith(user);
  });

  it('throws when updating a missing user', async () => {
    userRepositoryMock.findOneBy.mockResolvedValue(null);

    await expect(
      service.updateProfile(99, { firstName: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
