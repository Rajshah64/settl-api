import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../users/user.module';
import { JwtModule } from '@nestjs/jwt';
import {StringValue} from 'ms';

@Module({
  imports: [UserModule,JwtModule.register({
    secret: process.env.JWT_SECRET,
    signOptions: {
      expiresIn: process.env.JWT_EXPIRY as StringValue,
    },
  }),],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
