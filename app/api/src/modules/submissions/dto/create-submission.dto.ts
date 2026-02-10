import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ControlGroup } from '../../../common/enums';

export class CreateSubmissionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the implementation being assessed',
  })
  @IsUUID()
  implementationId!: string;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440001',
    description: 'UUID of the assessment template to use',
  })
  @IsUUID()
  templateId!: string;

  @ApiPropertyOptional({
    enum: ControlGroup,
    example: ControlGroup.DSCP1,
    description: 'Target Control Group for certification (DSCP1)',
    default: ControlGroup.DSCP1,
  })
  @IsEnum(ControlGroup)
  @IsOptional()
  targetControlGroup?: ControlGroup;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Name of the assessor conducting the assessment',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  assessorName?: string;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Date of the assessment (ISO 8601 format)',
  })
  @IsDateString()
  @IsOptional()
  assessmentDate?: string;

  @ApiPropertyOptional({
    example: 'Production DHIS2 server on AWS EC2 running Ubuntu 22.04',
    description: 'Description of the system environment being assessed',
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  systemEnvironment?: string;
}
