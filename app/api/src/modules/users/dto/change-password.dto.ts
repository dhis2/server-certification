import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { IsNotBreached } from 'src/shared/validators';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  /**
   * Password validation per NIST SP 800-63B:
   * - Minimum 8, maximum 64 characters (allows passphrases)
   * - Checked against Have I Been Pwned breach database via k-anonymity
   * - No composition rules (per NIST recommendation against them)
   *
   * @see https://haveibeenpwned.com/API/v3#PwnedPasswords
   */
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @IsNotBreached()
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
