import { IsBoolean, IsNumberString, IsOptional } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsNumberString()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}
