import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentTemplate } from '../entities/assessment-template.entity';
import { AssessmentCategory } from '../entities/assessment-category.entity';
import { Criterion } from '../entities/criterion.entity';

export class CriterionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  guidance!: string | null;

  @ApiProperty()
  weight!: number;

  @ApiProperty()
  isMandatory!: boolean;

  @ApiProperty()
  isCriticalFail!: boolean;

  @ApiProperty()
  minPassingScore!: number;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty()
  evidenceRequired!: boolean;

  @ApiPropertyOptional()
  evidenceDescription!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  static fromEntity(criterion: Criterion): CriterionResponseDto {
    const dto = new CriterionResponseDto();
    dto.id = criterion.id;
    dto.categoryId = criterion.categoryId;
    dto.code = criterion.code;
    dto.name = criterion.name;
    dto.description = criterion.description;
    dto.guidance = criterion.guidance;
    dto.weight = criterion.weight;
    dto.isMandatory = criterion.isMandatory;
    dto.isCriticalFail = criterion.isCriticalFail;
    dto.minPassingScore = criterion.minPassingScore;
    dto.maxScore = criterion.maxScore;
    dto.evidenceRequired = criterion.evidenceRequired;
    dto.evidenceDescription = criterion.evidenceDescription;
    dto.sortOrder = criterion.sortOrder;
    dto.createdAt = criterion.createdAt;
    return dto;
  }
}

export class CategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  templateId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  weight!: number;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ type: [CriterionResponseDto] })
  criteria?: CriterionResponseDto[];

  static fromEntity(
    category: AssessmentCategory,
    includeCriteria = false,
  ): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.templateId = category.templateId;
    dto.name = category.name;
    dto.description = category.description;
    dto.weight = category.weight;
    dto.sortOrder = category.sortOrder;
    dto.createdAt = category.createdAt;

    if (includeCriteria) {
      dto.criteria = category.criteria
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => CriterionResponseDto.fromEntity(c));
    }

    return dto;
  }
}

export class TemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  isPublished!: boolean;

  @ApiPropertyOptional()
  parentVersionId!: string | null;

  @ApiPropertyOptional()
  effectiveFrom!: Date | null;

  @ApiPropertyOptional()
  effectiveTo!: Date | null;

  @ApiPropertyOptional()
  createdById!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: [CategoryResponseDto] })
  categories?: CategoryResponseDto[];

  static fromEntity(
    template: AssessmentTemplate,
    includeCategories = false,
  ): TemplateResponseDto {
    const dto = new TemplateResponseDto();
    dto.id = template.id;
    dto.name = template.name;
    dto.description = template.description;
    dto.version = template.version;
    dto.isPublished = template.isPublished;
    dto.parentVersionId = template.parentVersionId;
    dto.effectiveFrom = template.effectiveFrom;
    dto.effectiveTo = template.effectiveTo;
    dto.createdById = template.createdById;
    dto.createdAt = template.createdAt;
    dto.updatedAt = template.updatedAt;

    if (includeCategories) {
      dto.categories = template.categories
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => CategoryResponseDto.fromEntity(c, true));
    }

    return dto;
  }
}

export class TemplateListResponseDto {
  @ApiProperty({ type: [TemplateResponseDto] })
  data!: TemplateResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
