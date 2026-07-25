import { IsString, Matches } from 'class-validator';

export class JoinGroupDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Invite code must be a 6-digit number' })
  code!: string;
}
