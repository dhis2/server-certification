import { IsNumberString, Length } from 'class-validator';

export class Verify2faSetupDto {
  @IsNumberString()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  code: string;
}
