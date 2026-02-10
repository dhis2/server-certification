import {
  IsString,
  IsEmail,
  IsUrl,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateImplementationDto {
  @ApiProperty({
    example: 'Ministry of Health Kenya',
    description: 'Implementation name',
  })
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9\s\-_.]+$/, {
    message: 'Name contains invalid characters',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Kenya',
    description: 'Country where the implementation is located',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: 'admin@health.go.ke',
    description: 'Contact email for the implementation (not a login email)',
  })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({
    example: '+254-20-271-7077',
    description: 'Contact phone number',
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({
    example: 'Kenya Ministry of Health DHIS2 implementation for HMIS',
    description: 'Description of the implementation',
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://dhis2.health.go.ke',
    description: 'URL of the DHIS2 instance being assessed',
  })
  @IsUrl()
  @MaxLength(500)
  @IsOptional()
  dhis2InstanceUrl?: string;

  @ApiPropertyOptional({
    example: '2.40.2',
    description: 'Version of DHIS2 being used',
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  dhis2Version?: string;
}
