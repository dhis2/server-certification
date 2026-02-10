import { TemplateConfigDto } from '../dto/template-config.dto';
import { TEMPLATE_VALIDATION_LIMITS } from '../../../common/constants';

describe('TemplateConfigDto', () => {
  describe('fromConstants', () => {
    it('should create DTO from validation limits', () => {
      const dto = TemplateConfigDto.fromConstants();

      expect(dto.maxFileSize).toBe(TEMPLATE_VALIDATION_LIMITS.MAX_FILE_SIZE);
      expect(dto.maxContentLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_CONTENT_LENGTH,
      );
      expect(dto.allowedExtensions).toEqual(
        TEMPLATE_VALIDATION_LIMITS.ALLOWED_EXTENSIONS,
      );
      expect(dto.allowedMimeTypes).toEqual(
        TEMPLATE_VALIDATION_LIMITS.ALLOWED_MIME_TYPES,
      );
      expect(dto.maxNameLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_NAME_LENGTH,
      );
      expect(dto.maxDescriptionLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH,
      );
      expect(dto.maxCriteriaPerCategory).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_CRITERIA_PER_CATEGORY,
      );
      expect(dto.maxCategoriesPerTemplate).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_CATEGORIES_PER_TEMPLATE,
      );
    });

    it('should include all field length limits', () => {
      const dto = TemplateConfigDto.fromConstants();

      expect(dto.maxCriterionCodeLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_CODE_LENGTH,
      );
      expect(dto.maxCriterionNameLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_NAME_LENGTH,
      );
      expect(dto.maxCriterionDescriptionLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_CRITERION_DESCRIPTION_LENGTH,
      );
      expect(dto.maxGuidanceLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_GUIDANCE_LENGTH,
      );
      expect(dto.maxEvidenceDescriptionLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_EVIDENCE_DESCRIPTION_LENGTH,
      );
      expect(dto.maxVerificationMethodLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_VERIFICATION_METHOD_LENGTH,
      );
      expect(dto.maxCisMappingLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_CIS_MAPPING_LENGTH,
      );
      expect(dto.maxFilenameLength).toBe(
        TEMPLATE_VALIDATION_LIMITS.MAX_FILENAME_LENGTH,
      );
    });

    it('should return consistent values across multiple calls', () => {
      const dto1 = TemplateConfigDto.fromConstants();
      const dto2 = TemplateConfigDto.fromConstants();

      expect(dto1.maxFileSize).toBe(dto2.maxFileSize);
      expect(dto1.maxContentLength).toBe(dto2.maxContentLength);
      expect(dto1.maxNameLength).toBe(dto2.maxNameLength);
    });
  });
});
