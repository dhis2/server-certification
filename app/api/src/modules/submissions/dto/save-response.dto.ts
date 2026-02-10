import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplianceStatus } from '../../../common/enums';

export class SaveSingleResponseDto {
  @ApiProperty({
    example: '770e8400-e29b-41d4-a716-446655440002',
    description: 'UUID of the criterion being assessed',
  })
  @IsUUID()
  criterionId!: string;

  @ApiProperty({
    enum: ComplianceStatus,
    example: ComplianceStatus.COMPLIANT,
    description: 'Compliance status for this criterion',
  })
  @IsEnum(ComplianceStatus)
  complianceStatus!: ComplianceStatus;

  @ApiPropertyOptional({
    example: 85,
    description: 'Score for this criterion (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({
    example:
      'Password policy is properly configured with minimum 12 characters',
    description: 'Detailed findings from the assessment',
  })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  findings?: string;

  @ApiPropertyOptional({
    example:
      'Verified via screenshot of password policy settings in DHIS2 admin console',
    description: 'Notes about the evidence collected',
  })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  evidenceNotes?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether remediation is required for this criterion',
  })
  @IsBoolean()
  @IsOptional()
  remediationRequired?: boolean;

  @ApiPropertyOptional({
    example: '2024-03-15',
    description: 'Target date for remediation completion (ISO 8601 format)',
  })
  @IsDateString()
  @IsOptional()
  remediationTargetDate?: string;

  @ApiPropertyOptional({
    example: 'IT Security Team',
    description: 'Person or team responsible for remediation',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  remediationOwner?: string;
}

export class SaveResponsesDto {
  @ApiProperty({
    type: [SaveSingleResponseDto],
    description: 'Array of criterion responses to save',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveSingleResponseDto)
  responses!: SaveSingleResponseDto[];

  @ApiPropertyOptional({
    example: 2,
    description: 'Current category index for progress tracking',
  })
  @IsNumber()
  @IsOptional()
  currentCategoryIndex?: number;
}
