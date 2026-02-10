import { IsString, Length, Matches } from 'class-validator';

export class VerifyRecoveryCodeDto {
  @IsString()
  @Length(8, 8, { message: 'Recovery code must be exactly 8 characters' })
  @Matches(/^[A-F0-9]{8}$/, { message: 'Invalid recovery code format' })
  code: string;
}
