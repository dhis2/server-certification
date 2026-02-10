import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ControlGroup,
  SubmissionStatus,
  CertificationResult,
  ComplianceStatus,
  ControlType,
} from '../../../common/enums';
import { Submission } from '../entities/submission.entity';
import { SubmissionResponse } from '../entities/submission-response.entity';
import { AssessmentTemplate } from '../../templates/entities/assessment-template.entity';
import { AssessmentCategory } from '../../templates/entities/assessment-category.entity';
import { Criterion } from '../../templates/entities/criterion.entity';

function toDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  return typeof value === 'string' ? value : null;
}

function toDateOnlyString(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'string') {
    return value.split('T')[0];
  }
  return null;
}

export class CriterionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  guidance!: string | null;

  @ApiProperty({ enum: ControlGroup })
  controlGroup!: ControlGroup;

  @ApiProperty({ enum: ControlType })
  controlType!: ControlType;

  @ApiPropertyOptional()
  cisMapping!: string | null;

  @ApiPropertyOptional()
  verificationMethod!: string | null;

  @ApiProperty()
  weight!: number;

  @ApiProperty()
  isMandatory!: boolean;

  @ApiProperty()
  evidenceRequired!: boolean;

  @ApiPropertyOptional()
  evidenceDescription!: string | null;

  static fromEntity(criterion: Criterion): CriterionResponseDto {
    const dto = new CriterionResponseDto();
    dto.id = criterion.id;
    dto.code = criterion.code;
    dto.name = criterion.name;
    dto.description = criterion.description;
    dto.guidance = criterion.guidance;
    dto.controlGroup = criterion.controlGroup;
    dto.controlType = criterion.controlType;
    dto.cisMapping = criterion.cisMapping;
    dto.verificationMethod = criterion.verificationMethod;
    dto.weight = Number(criterion.weight);
    dto.isMandatory = criterion.isMandatory;
    dto.evidenceRequired = criterion.evidenceRequired;
    dto.evidenceDescription = criterion.evidenceDescription;
    return dto;
  }
}

export class CategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  weight!: number;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: [CriterionResponseDto] })
  criteria!: CriterionResponseDto[];

  static fromEntity(category: AssessmentCategory): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.name = category.name;
    dto.description = category.description;
    dto.weight = Number(category.weight);
    dto.sortOrder = category.sortOrder;
    dto.criteria = (category.criteria || [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => CriterionResponseDto.fromEntity(c));
    return dto;
  }
}

export class TemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  version!: number;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty({ type: [CategoryResponseDto] })
  categories!: CategoryResponseDto[];

  static fromEntity(template: AssessmentTemplate): TemplateResponseDto {
    const dto = new TemplateResponseDto();
    dto.id = template.id;
    dto.name = template.name;
    dto.version = template.version;
    dto.description = template.description;
    dto.isPublished = template.isPublished;
    dto.categories = (template.categories || [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => CategoryResponseDto.fromEntity(c));
    return dto;
  }
}

export class ImplementationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  country!: string | null;

  @ApiPropertyOptional()
  dhis2InstanceUrl!: string | null;
}

export class SubmissionResponseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  submissionId!: string;

  @ApiProperty()
  criterionId!: string;

  @ApiProperty({ enum: ComplianceStatus })
  complianceStatus!: ComplianceStatus;

  @ApiPropertyOptional()
  score!: number | null;

  @ApiPropertyOptional()
  findings!: string | null;

  @ApiPropertyOptional()
  evidenceNotes!: string | null;

  @ApiProperty()
  remediationRequired!: boolean;

  @ApiPropertyOptional()
  remediationTargetDate!: string | null;

  @ApiPropertyOptional()
  remediationOwner!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static fromEntity(
    response: SubmissionResponse,
  ): SubmissionResponseResponseDto {
    const dto = new SubmissionResponseResponseDto();
    dto.id = response.id;
    dto.submissionId = response.submissionId;
    dto.criterionId = response.criterionId;
    dto.complianceStatus = response.complianceStatus;
    dto.score = response.score;
    dto.findings = response.findings;
    dto.evidenceNotes = response.evidenceNotes;
    dto.remediationRequired = response.remediationRequired;
    dto.remediationTargetDate = toDateOnlyString(
      response.remediationTargetDate,
    );
    dto.remediationOwner = response.remediationOwner;
    dto.createdAt = toDateString(response.createdAt) ?? '';
    dto.updatedAt = toDateString(response.updatedAt) ?? '';
    return dto;
  }
}

export class SubmissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  implementationId!: string;

  @ApiPropertyOptional({ type: ImplementationResponseDto })
  implementation?: ImplementationResponseDto;

  @ApiProperty()
  templateId!: string;

  @ApiPropertyOptional({ type: TemplateResponseDto })
  template?: TemplateResponseDto;

  @ApiProperty({ enum: ControlGroup })
  targetControlGroup!: ControlGroup;

  @ApiProperty({ enum: SubmissionStatus })
  status!: SubmissionStatus;

  @ApiPropertyOptional()
  assessorName!: string | null;

  @ApiPropertyOptional()
  assessmentDate!: string | null;

  @ApiPropertyOptional()
  systemEnvironment!: string | null;

  @ApiProperty()
  currentCategoryIndex!: number;

  @ApiPropertyOptional()
  totalScore!: number | null;

  @ApiPropertyOptional({ enum: CertificationResult })
  certificationResult!: CertificationResult | null;

  @ApiProperty()
  isCertified!: boolean;

  @ApiPropertyOptional()
  certificateNumber!: string | null;

  @ApiPropertyOptional()
  completedAt!: string | null;

  @ApiPropertyOptional()
  finalizedAt!: string | null;

  @ApiPropertyOptional()
  assessorNotes!: string | null;

  @ApiProperty()
  createdById!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: [SubmissionResponseResponseDto] })
  responses?: SubmissionResponseResponseDto[];

  static fromEntity(
    submission: Submission,
    withDetails = false,
  ): SubmissionResponseDto {
    const dto = new SubmissionResponseDto();
    dto.id = submission.id;
    dto.implementationId = submission.implementationId;
    dto.templateId = submission.templateId;
    dto.targetControlGroup = submission.targetControlGroup;
    dto.status = submission.status;
    dto.assessorName = submission.assessorName;
    dto.assessmentDate = toDateOnlyString(submission.assessmentDate);
    dto.systemEnvironment = submission.systemEnvironment;
    dto.currentCategoryIndex = submission.currentCategoryIndex;
    dto.totalScore = submission.totalScore;
    dto.certificationResult = submission.certificationResult;
    dto.isCertified = submission.isCertified;
    dto.certificateNumber = submission.certificateNumber;
    dto.completedAt = toDateString(submission.completedAt);
    dto.finalizedAt = toDateString(submission.finalizedAt);
    dto.assessorNotes = submission.assessorNotes;
    dto.createdById = submission.createdById;
    dto.createdAt = toDateString(submission.createdAt) ?? '';
    dto.updatedAt = toDateString(submission.updatedAt) ?? '';

    if (submission.implementation) {
      dto.implementation = {
        id: submission.implementation.id,
        name: submission.implementation.name,
        country: submission.implementation.country ?? null,
        dhis2InstanceUrl: submission.implementation.dhis2InstanceUrl ?? null,
      };
    }

    if (withDetails && submission.template) {
      dto.template = TemplateResponseDto.fromEntity(submission.template);
    }

    if (withDetails && submission.responses) {
      dto.responses = submission.responses.map((r) =>
        SubmissionResponseResponseDto.fromEntity(r),
      );
    }

    return dto;
  }
}
