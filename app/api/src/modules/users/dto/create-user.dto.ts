import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsNotBreached } from 'src/shared/validators';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  /**
   * Password validation per NIST SP 800-63B:
   * - Minimum 8, maximum 64 characters (allows passphrases)
   * - Checked against Have I Been Pwned breach database via k-anonymity
   * - No composition rules (per NIST recommendation against them)
   *
   * Uses the same breach-checking approach as Google Chrome, Apple, and Microsoft.
   *
   * @see https://pages.nist.gov/800-63-3/sp800-63b.html#memsecretver
   * @see https://haveibeenpwned.com/API/v3#PwnedPasswords
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  @IsNotBreached()
  password: string;

  @IsOptional()
  @IsNumberString()
  roleId?: string;
}
