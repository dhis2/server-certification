import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCategoryDto, CreateCriterionDto } from './create-template.dto';
import { TEMPLATE_VALIDATION_LIMITS } from '../../../common/constants';

export enum ImportFormat {
  YAML = 'yaml',
  JSON = 'json',
}

export class TemplateImportDto {
  @ApiProperty({
    enum: ImportFormat,
    example: ImportFormat.YAML,
    description: 'Content format',
  })
  @IsEnum(ImportFormat)
  format!: ImportFormat;

  @ApiProperty({
    example: 'name: DHIS2 Certification...',
    description: 'Template content in YAML or JSON format',
  })
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_CONTENT_LENGTH)
  content!: string;
}

export class BulkCriteriaDto {
  @ApiProperty({
    type: [CreateCriterionDto],
    description: 'Array of criteria to add',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCriterionDto)
  criteria!: CreateCriterionDto[];
}

export class BulkCategoriesDto {
  @ApiProperty({
    type: [CreateCategoryDto],
    description: 'Array of categories to add',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryDto)
  categories!: CreateCategoryDto[];
}

export class TemplateFileDto {
  @ApiProperty({
    example: 'dhis2-certification-v1.yaml',
    description: 'Filename in templates directory',
  })
  @IsString()
  @MaxLength(TEMPLATE_VALIDATION_LIMITS.MAX_FILENAME_LENGTH)
  filename!: string;
}

export class ImportResultDto {
  @ApiProperty({ example: true })
  created!: boolean;

  @ApiProperty({ example: false })
  updated!: boolean;

  @ApiProperty({ example: '01234567-89ab-cdef-0123-456789abcdef' })
  templateId!: string;

  @ApiProperty({ example: 'DHIS2 Server Certification Program' })
  name!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: 8 })
  categoriesCount!: number;

  @ApiProperty({ example: 45 })
  criteriaCount!: number;
}

export class ExportResultDto {
  @ApiProperty({ example: 'name: DHIS2 Server Certification...' })
  content!: string;

  @ApiProperty({ example: 'dhis2-server-certification-v1.yaml' })
  filename!: string;

  @ApiPropertyOptional({ example: 'application/x-yaml' })
  contentType?: string;
}

export class ValidationErrorDto {
  @ApiProperty({ example: '/categories/0/criteria/0/code' })
  path!: string;

  @ApiProperty({ example: 'Duplicate criterion code: DB-01' })
  message!: string;

  @ApiPropertyOptional({ example: 'uniqueItems' })
  keyword?: string;
}

export class ValidationResultDto {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiProperty({ type: [ValidationErrorDto] })
  errors!: ValidationErrorDto[];
}
