import { PartialType } from '@nestjs/mapped-types';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto{
    @IsEmail()
    email!: string;
    
    @IsString()
    password!: string;
}