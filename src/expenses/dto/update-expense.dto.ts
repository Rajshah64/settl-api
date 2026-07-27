import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaise?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paidByUserId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  participantUserIds?: number[];

  @IsOptional()
  @IsDateString()
  spentAt?: string;
}
