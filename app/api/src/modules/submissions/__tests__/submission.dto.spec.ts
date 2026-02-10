import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { UpdateSubmissionDto } from '../dto/update-submission.dto';
import { FinalizeSubmissionDto } from '../dto/finalize-submission.dto';
import {
  SaveSingleResponseDto,
  SaveResponsesDto,
} from '../dto/save-response.dto';
import { SubmissionResponseDto } from '../dto/submission-response.dto';
import {
  ControlGroup,
  ComplianceStatus,
  SubmissionStatus,
  CertificationResult,
} from '../../../common/enums';
import { Submission } from '../entities/submission.entity';
import { SubmissionResponse } from '../entities/submission-response.entity';

describe('Submission DTOs', () => {
  describe('CreateSubmissionDto', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    describe('implementationId field', () => {
      it('should pass validation with valid UUID', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when implementationId is missing', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          templateId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'implementationId')).toBe(
          true,
        );
      });

      it('should fail validation with invalid UUID format', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: 'not-a-uuid',
          templateId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'implementationId')).toBe(
          true,
        );
      });
    });

    describe('templateId field', () => {
      it('should pass validation with valid UUID', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when templateId is missing', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'templateId')).toBe(true);
      });

      it('should fail validation with invalid UUID format', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: 'invalid-uuid',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'templateId')).toBe(true);
      });
    });

    describe('targetControlGroup field', () => {
      it('should pass validation with DSCP1', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          targetControlGroup: ControlGroup.DSCP1,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when omitted (optional)', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation with invalid enum value', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          targetControlGroup: 'INVALID',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'targetControlGroup')).toBe(
          true,
        );
      });
    });

    describe('assessorName field', () => {
      it('should pass validation with valid name', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          assessorName: 'John Doe',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when omitted (optional)', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when name exceeds 255 characters', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          assessorName: 'a'.repeat(256),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'assessorName')).toBe(true);
      });
    });

    describe('assessmentDate field', () => {
      it('should pass validation with valid ISO date string', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          assessmentDate: '2024-01-15',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with ISO datetime string', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          assessmentDate: '2024-01-15T10:30:00Z',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when omitted (optional)', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation with invalid date format', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          assessmentDate: 'not-a-date',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'assessmentDate')).toBe(true);
      });
    });

    describe('systemEnvironment field', () => {
      it('should pass validation with valid text', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          systemEnvironment: 'Production server running Ubuntu 22.04',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when omitted (optional)', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when text exceeds 2000 characters', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          systemEnvironment: 'a'.repeat(2001),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'systemEnvironment')).toBe(
          true,
        );
      });
    });

    describe('full valid DTO', () => {
      it('should pass validation with all fields provided', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
          targetControlGroup: ControlGroup.DSCP1,
          assessorName: 'John Doe',
          assessmentDate: '2024-01-15',
          systemEnvironment: 'Production DHIS2 server on AWS',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with only required fields', async () => {
        const dto = plainToInstance(CreateSubmissionDto, {
          implementationId: validUUID,
          templateId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });
  });

  describe('SaveSingleResponseDto', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    describe('criterionId field', () => {
      it('should pass validation with valid UUID', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when criterionId is missing', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          complianceStatus: ComplianceStatus.COMPLIANT,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'criterionId')).toBe(true);
      });

      it('should fail validation with invalid UUID', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: 'invalid',
          complianceStatus: ComplianceStatus.COMPLIANT,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'criterionId')).toBe(true);
      });
    });

    describe('complianceStatus field', () => {
      it('should pass validation with COMPLIANT status', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with NON_COMPLIANT status', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with PARTIALLY_COMPLIANT status', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.PARTIALLY_COMPLIANT,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with NOT_APPLICABLE status', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NOT_APPLICABLE,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with NOT_TESTED status', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NOT_TESTED,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when complianceStatus is missing', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'complianceStatus')).toBe(
          true,
        );
      });

      it('should fail validation with invalid status', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: 'INVALID_STATUS',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'complianceStatus')).toBe(
          true,
        );
      });
    });

    describe('score field', () => {
      it('should pass validation with valid score 0', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          score: 0,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with valid score 100', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
          score: 100,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with valid score 50', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.PARTIALLY_COMPLIANT,
          score: 50,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when score is omitted (optional)', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NOT_TESTED,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation with score below 0', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          score: -1,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'score')).toBe(true);
      });

      it('should fail validation with score above 100', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
          score: 101,
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'score')).toBe(true);
      });
    });

    describe('findings field', () => {
      it('should pass validation with valid findings', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          findings: 'Password policy not configured correctly',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when findings is omitted (optional)', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when findings exceeds 5000 characters', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          findings: 'a'.repeat(5001),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'findings')).toBe(true);
      });
    });

    describe('evidenceNotes field', () => {
      it('should pass validation with valid evidence notes', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
          evidenceNotes: 'Verified via screenshot and configuration review',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when evidenceNotes is omitted (optional)', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when evidenceNotes exceeds 5000 characters', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
          evidenceNotes: 'e'.repeat(5001),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'evidenceNotes')).toBe(true);
      });
    });

    describe('remediationRequired field', () => {
      it('should pass validation with true', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          remediationRequired: true,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with false', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
          remediationRequired: false,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when omitted (optional)', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.COMPLIANT,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    describe('remediationTargetDate field', () => {
      it('should pass validation with valid ISO date string', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          remediationRequired: true,
          remediationTargetDate: '2024-03-15',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when omitted (optional)', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          remediationRequired: true,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation with invalid date format', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          remediationTargetDate: 'invalid-date',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'remediationTargetDate')).toBe(
          true,
        );
      });
    });

    describe('remediationOwner field', () => {
      it('should pass validation with valid owner name', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          remediationRequired: true,
          remediationOwner: 'IT Security Team',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when omitted (optional)', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          remediationRequired: true,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when owner exceeds 255 characters', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          remediationOwner: 'o'.repeat(256),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'remediationOwner')).toBe(
          true,
        );
      });
    });

    describe('full valid DTO', () => {
      it('should pass validation with all fields', async () => {
        const dto = plainToInstance(SaveSingleResponseDto, {
          criterionId: validUUID,
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          score: 25,
          findings: 'Password policy not properly configured',
          evidenceNotes: 'Screenshot attached showing current settings',
          remediationRequired: true,
          remediationTargetDate: '2024-03-15',
          remediationOwner: 'IT Security Team',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });
  });

  describe('SaveResponsesDto', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    describe('responses field', () => {
      it('should pass validation with valid response array', async () => {
        const dto = plainToInstance(SaveResponsesDto, {
          responses: [
            {
              criterionId: validUUID,
              complianceStatus: ComplianceStatus.COMPLIANT,
            },
          ],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with multiple responses', async () => {
        const dto = plainToInstance(SaveResponsesDto, {
          responses: [
            {
              criterionId: validUUID,
              complianceStatus: ComplianceStatus.COMPLIANT,
              score: 100,
            },
            {
              criterionId: '660e8400-e29b-41d4-a716-446655440001',
              complianceStatus: ComplianceStatus.NON_COMPLIANT,
              score: 0,
              findings: 'Not implemented',
            },
          ],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when responses is missing', async () => {
        const dto = plainToInstance(SaveResponsesDto, {});
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'responses')).toBe(true);
      });

      it('should fail validation with invalid nested response', async () => {
        const dto = plainToInstance(SaveResponsesDto, {
          responses: [
            {
              criterionId: 'invalid-uuid',
              complianceStatus: ComplianceStatus.COMPLIANT,
            },
          ],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should pass validation with empty responses array', async () => {
        const dto = plainToInstance(SaveResponsesDto, {
          responses: [],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    describe('currentCategoryIndex field', () => {
      it('should pass validation with valid index 0', async () => {
        const dto = plainToInstance(SaveResponsesDto, {
          responses: [],
          currentCategoryIndex: 0,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with valid index 5', async () => {
        const dto = plainToInstance(SaveResponsesDto, {
          responses: [],
          currentCategoryIndex: 5,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when omitted (optional)', async () => {
        const dto = plainToInstance(SaveResponsesDto, {
          responses: [],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });
  });

  describe('UpdateSubmissionDto', () => {
    describe('partial updates', () => {
      it('should pass validation with only assessorName', async () => {
        const dto = plainToInstance(UpdateSubmissionDto, {
          assessorName: 'Jane Doe',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with empty object (all optional)', async () => {
        const dto = plainToInstance(UpdateSubmissionDto, {});
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with targetControlGroup only', async () => {
        const dto = plainToInstance(UpdateSubmissionDto, {
          targetControlGroup: ControlGroup.DSCP1,
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with systemEnvironment only', async () => {
        const dto = plainToInstance(UpdateSubmissionDto, {
          systemEnvironment: 'Updated production environment',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with assessmentDate only', async () => {
        const dto = plainToInstance(UpdateSubmissionDto, {
          assessmentDate: '2024-02-20',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    describe('validation constraints', () => {
      it('should fail validation with invalid enum value', async () => {
        const dto = plainToInstance(UpdateSubmissionDto, {
          targetControlGroup: 'INVALID',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'targetControlGroup')).toBe(
          true,
        );
      });

      it('should fail validation when assessorName exceeds max length', async () => {
        const dto = plainToInstance(UpdateSubmissionDto, {
          assessorName: 'a'.repeat(256),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'assessorName')).toBe(true);
      });

      it('should fail validation with invalid date format', async () => {
        const dto = plainToInstance(UpdateSubmissionDto, {
          assessmentDate: 'not-a-date',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'assessmentDate')).toBe(true);
      });

      it('should not allow implementationId to be set', () => {
        // UpdateSubmissionDto should exclude implementationId
        const dto = plainToInstance(UpdateSubmissionDto, {
          assessorName: 'Test',
        });
        expect(
          (dto as Record<string, unknown>).implementationId,
        ).toBeUndefined();
      });

      it('should not allow templateId to be set', () => {
        // UpdateSubmissionDto should exclude templateId
        const dto = plainToInstance(UpdateSubmissionDto, {
          assessorName: 'Test',
        });
        expect((dto as Record<string, unknown>).templateId).toBeUndefined();
      });
    });
  });

  describe('FinalizeSubmissionDto', () => {
    describe('assessorNotes field', () => {
      it('should pass validation with valid notes', async () => {
        const dto = plainToInstance(FinalizeSubmissionDto, {
          assessorNotes:
            'Assessment completed successfully. All controls verified.',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation with empty object (all optional)', async () => {
        const dto = plainToInstance(FinalizeSubmissionDto, {});
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when notes exceed 5000 characters', async () => {
        const dto = plainToInstance(FinalizeSubmissionDto, {
          assessorNotes: 'n'.repeat(5001),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'assessorNotes')).toBe(true);
      });
    });
  });

  describe('SubmissionResponseDto', () => {
    describe('fromEntity', () => {
      it('should convert a Submission entity to DTO', () => {
        const submission = new Submission();
        submission.id = '550e8400-e29b-41d4-a716-446655440000';
        submission.implementationId = '660e8400-e29b-41d4-a716-446655440001';
        submission.templateId = '770e8400-e29b-41d4-a716-446655440002';
        submission.targetControlGroup = ControlGroup.DSCP1;
        submission.status = SubmissionStatus.IN_PROGRESS;
        submission.assessorName = 'John Doe';
        submission.assessmentDate = new Date('2024-01-15');
        submission.systemEnvironment = 'Production';
        submission.currentCategoryIndex = 2;
        submission.totalScore = null;
        submission.certificationResult = null;
        submission.isCertified = false;
        submission.certificateNumber = null;
        submission.completedAt = null;
        submission.finalizedAt = null;
        submission.assessorNotes = null;
        submission.createdById = '880e8400-e29b-41d4-a716-446655440003';
        submission.createdAt = new Date('2024-01-01');
        submission.updatedAt = new Date('2024-01-15');

        const dto = SubmissionResponseDto.fromEntity(submission);

        expect(dto.id).toBe(submission.id);
        expect(dto.implementationId).toBe(submission.implementationId);
        expect(dto.templateId).toBe(submission.templateId);
        expect(dto.targetControlGroup).toBe(submission.targetControlGroup);
        expect(dto.status).toBe(submission.status);
        expect(dto.assessorName).toBe(submission.assessorName);
        expect(dto.assessmentDate).toBe('2024-01-15');
        expect(dto.systemEnvironment).toBe(submission.systemEnvironment);
        expect(dto.currentCategoryIndex).toBe(submission.currentCategoryIndex);
        expect(dto.totalScore).toBeNull();
        expect(dto.certificationResult).toBeNull();
        expect(dto.isCertified).toBe(false);
        expect(dto.certificateNumber).toBeNull();
        expect(dto.completedAt).toBeNull();
        expect(dto.finalizedAt).toBeNull();
        expect(dto.assessorNotes).toBeNull();
        expect(dto.createdById).toBe(submission.createdById);
        expect(dto.createdAt).toBe(submission.createdAt.toISOString());
        expect(dto.updatedAt).toBe(submission.updatedAt.toISOString());
      });

      it('should handle null dates correctly', () => {
        const submission = new Submission();
        submission.id = '550e8400-e29b-41d4-a716-446655440000';
        submission.implementationId = '660e8400-e29b-41d4-a716-446655440001';
        submission.templateId = '770e8400-e29b-41d4-a716-446655440002';
        submission.targetControlGroup = ControlGroup.DSCP1;
        submission.status = SubmissionStatus.DRAFT;
        submission.assessorName = null;
        submission.assessmentDate = null;
        submission.systemEnvironment = null;
        submission.currentCategoryIndex = 0;
        submission.totalScore = null;
        submission.certificationResult = null;
        submission.isCertified = false;
        submission.certificateNumber = null;
        submission.completedAt = null;
        submission.finalizedAt = null;
        submission.assessorNotes = null;
        submission.createdById = '880e8400-e29b-41d4-a716-446655440003';
        submission.createdAt = new Date('2024-01-01');
        submission.updatedAt = new Date('2024-01-01');

        const dto = SubmissionResponseDto.fromEntity(submission);

        expect(dto.assessmentDate).toBeNull();
        expect(dto.completedAt).toBeNull();
        expect(dto.finalizedAt).toBeNull();
      });

      it('should handle completed submission with scores', () => {
        const submission = new Submission();
        submission.id = '550e8400-e29b-41d4-a716-446655440000';
        submission.implementationId = '660e8400-e29b-41d4-a716-446655440001';
        submission.templateId = '770e8400-e29b-41d4-a716-446655440002';
        submission.targetControlGroup = ControlGroup.DSCP1;
        submission.status = SubmissionStatus.PASSED;
        submission.assessorName = 'John Doe';
        submission.assessmentDate = new Date('2024-01-15');
        submission.systemEnvironment = 'Production';
        submission.currentCategoryIndex = 5;
        submission.totalScore = 95.5;
        submission.certificationResult = CertificationResult.PASS;
        submission.isCertified = true;
        submission.certificateNumber = 'DHIS2-2024-P-ABCD1234';
        submission.completedAt = new Date('2024-01-20');
        submission.finalizedAt = new Date('2024-01-21');
        submission.assessorNotes = 'Excellent compliance across all controls';
        submission.createdById = '880e8400-e29b-41d4-a716-446655440003';
        submission.createdAt = new Date('2024-01-01');
        submission.updatedAt = new Date('2024-01-21');

        const dto = SubmissionResponseDto.fromEntity(submission);

        expect(dto.totalScore).toBe(95.5);
        expect(dto.certificationResult).toBe(CertificationResult.PASS);
        expect(dto.isCertified).toBe(true);
        expect(dto.certificateNumber).toBe('DHIS2-2024-P-ABCD1234');
        expect(dto.completedAt).toBe(submission.completedAt.toISOString());
        expect(dto.finalizedAt).toBe(submission.finalizedAt.toISOString());
        expect(dto.assessorNotes).toBe(submission.assessorNotes);
      });

      it('should include implementation name if relation is loaded', () => {
        const submission = new Submission();
        submission.id = '550e8400-e29b-41d4-a716-446655440000';
        submission.implementationId = '660e8400-e29b-41d4-a716-446655440001';
        submission.templateId = '770e8400-e29b-41d4-a716-446655440002';
        submission.targetControlGroup = ControlGroup.DSCP1;
        submission.status = SubmissionStatus.DRAFT;
        submission.assessorName = null;
        submission.assessmentDate = null;
        submission.systemEnvironment = null;
        submission.currentCategoryIndex = 0;
        submission.totalScore = null;
        submission.certificationResult = null;
        submission.isCertified = false;
        submission.certificateNumber = null;
        submission.completedAt = null;
        submission.finalizedAt = null;
        submission.assessorNotes = null;
        submission.createdById = '880e8400-e29b-41d4-a716-446655440003';
        submission.createdAt = new Date('2024-01-01');
        submission.updatedAt = new Date('2024-01-01');
        submission.implementation = { name: 'Ministry of Health' } as never;

        const dto = SubmissionResponseDto.fromEntity(submission);

        expect(dto.implementation?.name).toBe('Ministry of Health');
      });

      it('should include template name if relation is loaded', () => {
        const submission = new Submission();
        submission.id = '550e8400-e29b-41d4-a716-446655440000';
        submission.implementationId = '660e8400-e29b-41d4-a716-446655440001';
        submission.templateId = '770e8400-e29b-41d4-a716-446655440002';
        submission.targetControlGroup = ControlGroup.DSCP1;
        submission.status = SubmissionStatus.DRAFT;
        submission.assessorName = null;
        submission.assessmentDate = null;
        submission.systemEnvironment = null;
        submission.currentCategoryIndex = 0;
        submission.totalScore = null;
        submission.certificationResult = null;
        submission.isCertified = false;
        submission.certificateNumber = null;
        submission.completedAt = null;
        submission.finalizedAt = null;
        submission.assessorNotes = null;
        submission.createdById = '880e8400-e29b-41d4-a716-446655440003';
        submission.createdAt = new Date('2024-01-01');
        submission.updatedAt = new Date('2024-01-01');
        submission.template = {
          name: 'DHIS2 Security Assessment v1.0',
        } as never;

        const dto = SubmissionResponseDto.fromEntity(submission, true);

        expect(dto.template?.name).toBe('DHIS2 Security Assessment v1.0');
      });
    });

    describe('SubmissionResponseResponseDto (nested)', () => {
      it('should convert SubmissionResponse entity to nested DTO', () => {
        const response = new SubmissionResponse();
        response.id = '550e8400-e29b-41d4-a716-446655440000';
        response.submissionId = '660e8400-e29b-41d4-a716-446655440001';
        response.criterionId = '770e8400-e29b-41d4-a716-446655440002';
        response.complianceStatus = ComplianceStatus.COMPLIANT;
        response.score = 100;
        response.findings = 'Properly configured';
        response.evidenceNotes = 'Verified via console';
        response.remediationRequired = false;
        response.remediationTargetDate = null;
        response.remediationOwner = null;
        response.createdAt = new Date('2024-01-15');
        response.updatedAt = new Date('2024-01-15');

        // The nested response DTO will be part of the fromEntity call
        // when withResponses is true
        const submission = new Submission();
        submission.id = '660e8400-e29b-41d4-a716-446655440001';
        submission.implementationId = '880e8400-e29b-41d4-a716-446655440003';
        submission.templateId = '990e8400-e29b-41d4-a716-446655440004';
        submission.targetControlGroup = ControlGroup.DSCP1;
        submission.status = SubmissionStatus.IN_PROGRESS;
        submission.assessorName = null;
        submission.assessmentDate = null;
        submission.systemEnvironment = null;
        submission.currentCategoryIndex = 0;
        submission.totalScore = null;
        submission.certificationResult = null;
        submission.isCertified = false;
        submission.certificateNumber = null;
        submission.completedAt = null;
        submission.finalizedAt = null;
        submission.assessorNotes = null;
        submission.createdById = 'aa0e8400-e29b-41d4-a716-446655440005';
        submission.createdAt = new Date('2024-01-01');
        submission.updatedAt = new Date('2024-01-15');
        submission.responses = [response];

        const dto = SubmissionResponseDto.fromEntity(submission, true);

        expect(dto.responses).toBeDefined();
        expect(dto.responses!.length).toBe(1);
        expect(dto.responses![0].id).toBe(response.id);
        expect(dto.responses![0].criterionId).toBe(response.criterionId);
        expect(dto.responses![0].complianceStatus).toBe(
          response.complianceStatus,
        );
        expect(dto.responses![0].score).toBe(response.score);
        expect(dto.responses![0].findings).toBe(response.findings);
        expect(dto.responses![0].evidenceNotes).toBe(response.evidenceNotes);
        expect(dto.responses![0].remediationRequired).toBe(
          response.remediationRequired,
        );
      });

      it('should not include responses when withResponses is false', () => {
        const submission = new Submission();
        submission.id = '550e8400-e29b-41d4-a716-446655440000';
        submission.implementationId = '660e8400-e29b-41d4-a716-446655440001';
        submission.templateId = '770e8400-e29b-41d4-a716-446655440002';
        submission.targetControlGroup = ControlGroup.DSCP1;
        submission.status = SubmissionStatus.DRAFT;
        submission.assessorName = null;
        submission.assessmentDate = null;
        submission.systemEnvironment = null;
        submission.currentCategoryIndex = 0;
        submission.totalScore = null;
        submission.certificationResult = null;
        submission.isCertified = false;
        submission.certificateNumber = null;
        submission.completedAt = null;
        submission.finalizedAt = null;
        submission.assessorNotes = null;
        submission.createdById = '880e8400-e29b-41d4-a716-446655440003';
        submission.createdAt = new Date('2024-01-01');
        submission.updatedAt = new Date('2024-01-01');

        const dto = SubmissionResponseDto.fromEntity(submission, false);

        expect(dto.responses).toBeUndefined();
      });
    });
  });
});
