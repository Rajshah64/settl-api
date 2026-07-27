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

export class CreateExpenseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  /** Total in paise (e.g. 120000 = ₹1200.00). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaise!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  paidByUserId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  participantUserIds!: number[];

  @IsOptional()
  @IsDateString()
  spentAt?: string;
}
