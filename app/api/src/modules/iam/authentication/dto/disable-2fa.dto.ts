import {
  IsNumberString,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class Disable2faDto {
  @IsNumberString()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  code: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;
}
