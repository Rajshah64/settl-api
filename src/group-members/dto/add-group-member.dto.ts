import { IsInt, Min } from 'class-validator';

export class AddGroupMemberDto {
  @IsInt()
  @Min(1)
  userId!: number;
}
