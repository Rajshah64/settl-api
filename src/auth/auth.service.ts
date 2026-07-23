import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserService } from '../users/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'This email is already under use. Try with another email.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userService.create({
      ...registerDto,
      password: hashedPassword,
    });

    return this.issueAccessToken(user.id, user.email);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    //validate the password with the hlep of bcrypt compare function.
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueAccessToken(user.id, user.email);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userService.findByIdWithPassword(userId);

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new ConflictException(
        'New password must be different from the current password',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userService.updatePassword(userId, hashedPassword);

    return { message: 'Password updated successfully' };
  }

  private async issueAccessToken(userId: number, email: string) {
    const accessToken = await this.jwtService.signAsync({
      sub: userId,
      email,
    });

    return { accessToken };
  }
}
