import {
  IsString,
  IsOptional,
  MaxLength,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ControlGroup, ControlType } from '../../../common/enums';

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'DHIS2 Server Certification v2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | undefined;

  @ApiPropertyOptional({ example: 'Updated certification template' })
  @IsOptional()
  @IsString()
  description?: string | null | undefined;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null | undefined;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null | undefined;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Infrastructure Setup' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | undefined;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string | null | undefined;

  @ApiPropertyOptional({ example: 0.25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weight?: number | undefined;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number | undefined;
}

export class UpdateCriterionDto {
  @ApiPropertyOptional({ example: 'INF-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string | undefined;

  @ApiPropertyOptional({ example: 'Updated Server Requirements' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | undefined;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string | null | undefined;

  @ApiPropertyOptional({ example: 'Updated guidance' })
  @IsOptional()
  @IsString()
  guidance?: string | null | undefined;

  @ApiPropertyOptional({ example: 0.3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weight?: number | undefined;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean | undefined;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCriticalFail?: boolean | undefined;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPassingScore?: number | undefined;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxScore?: number | undefined;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  evidenceRequired?: boolean | undefined;

  @ApiPropertyOptional({ example: 'Provide updated evidence' })
  @IsOptional()
  @IsString()
  evidenceDescription?: string | null | undefined;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number | undefined;

  @ApiPropertyOptional({
    enum: ControlGroup,
    example: ControlGroup.DSCP1,
    description: 'Control Group (DSCP1)',
  })
  @IsOptional()
  @IsEnum(ControlGroup)
  controlGroup?: ControlGroup | undefined;

  @ApiPropertyOptional({
    enum: ControlType,
    example: ControlType.TECHNICAL,
    description: 'Control type (technical or organizational)',
  })
  @IsOptional()
  @IsEnum(ControlType)
  controlType?: ControlType | undefined;

  @ApiPropertyOptional({
    example: '11.2',
    description: 'CIS Controls mapping reference',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cisMapping?: string | null | undefined;

  @ApiPropertyOptional({
    example:
      'Review backup configuration files; verify backup logs from past 30 days',
    description: 'Method to verify compliance with this control',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  verificationMethod?: string | null | undefined;
}
