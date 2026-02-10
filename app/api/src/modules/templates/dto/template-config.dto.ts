import { ApiProperty } from '@nestjs/swagger';
import { TEMPLATE_VALIDATION_LIMITS } from '../../../common/constants';

export class TemplateConfigDto {
  @ApiProperty({ example: 5242880, description: 'Maximum file size in bytes' })
  maxFileSize!: number;

  @ApiProperty({
    example: 5242880,
    description: 'Maximum content length in bytes',
  })
  maxContentLength!: number;

  @ApiProperty({
    example: ['.yaml', '.yml', '.json'],
    description: 'Allowed file extensions',
  })
  allowedExtensions!: readonly string[];

  @ApiProperty({
    example: ['application/x-yaml', 'application/json'],
    description: 'Allowed MIME types',
  })
  allowedMimeTypes!: readonly string[];

  @ApiProperty({ example: 255, description: 'Maximum template name length' })
  maxNameLength!: number;

  @ApiProperty({
    example: 4000,
    description: 'Maximum description length',
  })
  maxDescriptionLength!: number;

  @ApiProperty({
    example: 100,
    description: 'Maximum criteria per category',
  })
  maxCriteriaPerCategory!: number;

  @ApiProperty({
    example: 50,
    description: 'Maximum categories per template',
  })
  maxCategoriesPerTemplate!: number;

  @ApiProperty({
    example: 50,
    description: 'Maximum criterion code length',
  })
  maxCriterionCodeLength!: number;

  @ApiProperty({
    example: 255,
    description: 'Maximum criterion name length',
  })
  maxCriterionNameLength!: number;

  @ApiProperty({
    example: 2000,
    description: 'Maximum criterion description length',
  })
  maxCriterionDescriptionLength!: number;

  @ApiProperty({
    example: 4000,
    description: 'Maximum guidance text length',
  })
  maxGuidanceLength!: number;

  @ApiProperty({
    example: 1000,
    description: 'Maximum evidence description length',
  })
  maxEvidenceDescriptionLength!: number;

  @ApiProperty({
    example: 4000,
    description: 'Maximum verification method length',
  })
  maxVerificationMethodLength!: number;

  @ApiProperty({
    example: 50,
    description: 'Maximum CIS mapping length',
  })
  maxCisMappingLength!: number;

  @ApiProperty({
    example: 255,
    description: 'Maximum filename length',
  })
  maxFilenameLength!: number;

  static fromConstants(): TemplateConfigDto {
    const dto = new TemplateConfigDto();
    dto.maxFileSize = TEMPLATE_VALIDATION_LIMITS.MAX_FILE_SIZE;
    dto.maxContentLength = TEMPLATE_VALIDATION_LIMITS.MAX_CONTENT_LENGTH;
    dto.allowedExtensions = TEMPLATE_VALIDATION_LIMITS.ALLOWED_EXTENSIONS;
    dto.allowedMimeTypes = TEMPLATE_VALIDATION_LIMITS.ALLOWED_MIME_TYPES;
    dto.maxNameLength = TEMPLATE_VALIDATION_LIMITS.MAX_NAME_LENGTH;
    dto.maxDescriptionLength =
      TEMPLATE_VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH;
    dto.maxCriteriaPerCategory =
      TEMPLATE_VALIDATION_LIMITS.MAX_CRITERIA_PER_CATEGORY;
    dto.maxCategoriesPerTemplate =
      TEMPLATE_VALIDATION_LIMITS.MAX_CATEGORIES_PER_TEMPLATE;
    dto.maxCriterionCodeLength =
      TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_CODE_LENGTH;
    dto.maxCriterionNameLength =
      TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_NAME_LENGTH;
    dto.maxCriterionDescriptionLength =
      TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_DESCRIPTION_LENGTH;
    dto.maxGuidanceLength = TEMPLATE_VALIDATION_LIMITS.MAX_GUIDANCE_LENGTH;
    dto.maxEvidenceDescriptionLength =
      TEMPLATE_VALIDATION_LIMITS.MAX_EVIDENCE_DESCRIPTION_LENGTH;
    dto.maxVerificationMethodLength =
      TEMPLATE_VALIDATION_LIMITS.MAX_VERIFICATION_METHOD_LENGTH;
    dto.maxCisMappingLength = TEMPLATE_VALIDATION_LIMITS.MAX_CIS_MAPPING_LENGTH;
    dto.maxFilenameLength = TEMPLATE_VALIDATION_LIMITS.MAX_FILENAME_LENGTH;
    return dto;
  }
}
