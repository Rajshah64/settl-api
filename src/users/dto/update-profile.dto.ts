import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  /** UPI VPA (e.g. name@oksbi). Empty string clears it. */
  @IsOptional()
  @IsString()
  @Matches(/^$|^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, {
    message: 'upiId must be a valid UPI ID (e.g. name@oksbi) or empty',
  })
  upiId?: string;
}
