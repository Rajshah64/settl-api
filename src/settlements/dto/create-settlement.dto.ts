import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSettlementDto {
  /** Debtor who paid. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromUserId!: number;

  /** Creditor who received. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  toUserId!: number;

  /** Amount in paise. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaise!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  note?: string;
}
