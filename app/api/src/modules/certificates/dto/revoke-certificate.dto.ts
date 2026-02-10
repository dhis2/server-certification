import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevokeCertificateDto {
  @ApiProperty({ description: 'Reason for revocation', minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}
