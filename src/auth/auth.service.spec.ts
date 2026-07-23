import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const userServiceMock = {
    findByEmail: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findByIdWithPassword: jest.fn(),
    create: jest.fn(),
    updatePassword: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs in when email and password match', async () => {
    userServiceMock.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      email: 'raj@test.com',
      password: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('token');

    const result = await service.login({
      email: 'raj@test.com',
      password: 'password123',
    });

    expect(userServiceMock.findByEmailWithPassword).toHaveBeenCalledWith(
      'raj@test.com',
    );
    expect(result).toEqual({ accessToken: 'token' });
  });

  it('rejects login when password is wrong', async () => {
    userServiceMock.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      email: 'raj@test.com',
      password: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'raj@test.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changes password when current password is valid', async () => {
    userServiceMock.findByIdWithPassword.mockResolvedValue({
      id: 1,
      password: 'old-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    userServiceMock.updatePassword.mockResolvedValue(undefined);

    const result = await service.changePassword(1, {
      currentPassword: 'oldpass12',
      newPassword: 'newpass12',
    });

    expect(userServiceMock.updatePassword).toHaveBeenCalledWith(1, 'new-hash');
    expect(result).toEqual({ message: 'Password updated successfully' });
  });

  it('rejects change-password when current password is wrong', async () => {
    userServiceMock.findByIdWithPassword.mockResolvedValue({
      id: 1,
      password: 'old-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.changePassword(1, {
        currentPassword: 'wrong',
        newPassword: 'newpass12',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects change-password when new password equals current', async () => {
    userServiceMock.findByIdWithPassword.mockResolvedValue({
      id: 1,
      password: 'old-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.changePassword(1, {
        currentPassword: 'samePass1',
        newPassword: 'samePass1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
