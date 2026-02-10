import {
  IsString,
  IsOptional,
  MaxLength,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  ArrayMaxSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ControlGroup, ControlType } from '../../../common/enums';
import { TEMPLATE_VALIDATION_LIMITS } from '../../../common/constants';

export class CreateCriterionDto {
  @ApiProperty({
    example: 'INF-001',
    description: 'Unique code within category',
  })
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_CODE_LENGTH)
  code!: string;

  @ApiProperty({ example: 'Server Hardware Requirements' })
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_NAME_LENGTH)
  name!: string;

  @ApiPropertyOptional({ example: 'Verify minimum hardware specifications' })
  @IsOptional()
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_DESCRIPTION_LENGTH)
  description?: string | undefined;

  @ApiPropertyOptional({
    example: 'Check CPU cores, RAM, and storage capacity',
  })
  @IsOptional()
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_GUIDANCE_LENGTH)
  guidance?: string | undefined;

  @ApiProperty({ example: 0.25, description: 'Weight within category (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean | undefined;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCriticalFail?: boolean | undefined;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPassingScore?: number | undefined;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxScore?: number | undefined;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  evidenceRequired?: boolean | undefined;

  @ApiPropertyOptional({ example: 'Provide screenshot of server specs' })
  @IsOptional()
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_EVIDENCE_DESCRIPTION_LENGTH)
  evidenceDescription?: string | undefined;

  @ApiProperty({ example: 1, description: 'Display order within category' })
  @IsNumber()
  @Min(0)
  sortOrder!: number;

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
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_CIS_MAPPING_LENGTH)
  cisMapping?: string | null | undefined;

  @ApiPropertyOptional({
    example:
      'Review backup configuration files; verify backup logs from past 30 days',
    description: 'Method to verify compliance with this control',
  })
  @IsOptional()
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_VERIFICATION_METHOD_LENGTH)
  verificationMethod?: string | null | undefined;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Infrastructure Setup' })
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_NAME_LENGTH)
  name!: string;

  @ApiPropertyOptional({
    example: 'Server infrastructure and hardware requirements',
  })
  @IsOptional()
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_DESCRIPTION_LENGTH)
  description?: string | undefined;

  @ApiProperty({ example: 0.2, description: 'Weight of category (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight!: number;

  @ApiProperty({ example: 1, description: 'Display order within template' })
  @IsNumber()
  @Min(0)
  sortOrder!: number;

  @ApiPropertyOptional({ type: [CreateCriterionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TEMPLATE_VALIDATION_LIMITS.MAX_CRITERIA_PER_CATEGORY)
  @ValidateNested({ each: true })
  @Type(() => CreateCriterionDto)
  criteria?: CreateCriterionDto[] | undefined;
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'DHIS2 Server Certification' })
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_NAME_LENGTH)
  name!: string;

  @ApiPropertyOptional({
    example: 'Certification template for DHIS2 server deployments',
  })
  @IsOptional()
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH)
  description?: string | undefined;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'ISO 8601 date' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | undefined;

  @ApiPropertyOptional({ example: '2027-12-31', description: 'ISO 8601 date' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | undefined;

  @ApiPropertyOptional({ type: [CreateCategoryDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TEMPLATE_VALIDATION_LIMITS.MAX_CATEGORIES_PER_TEMPLATE)
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryDto)
  categories?: CreateCategoryDto[] | undefined;
}
