import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../users/user.module';
import { JwtModule } from '@nestjs/jwt';
import {StringValue} from 'ms'
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { config } from 'process';
import { JwtStrategy } from './jwt.strategy';

console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('JWT_EXPIRY:', process.env.JWT_EXPIRY);

@Module({
  
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_EXPIRY') as StringValue,
        } ,
      }),
    } 
    ),
  ],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy],
})

export class AuthModule {}
