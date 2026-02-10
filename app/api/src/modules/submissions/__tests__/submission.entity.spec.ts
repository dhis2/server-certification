import { Submission } from '../entities/submission.entity';
import {
  ControlGroup,
  SubmissionStatus,
  CertificationResult,
} from '../../../common/enums';

describe('Submission Entity', () => {
  let submission: Submission;

  beforeEach(() => {
    submission = new Submission();
  });

  describe('basic properties', () => {
    it('should set implementationId property', () => {
      const implementationId = '01912345-0000-7abc-def0-123456789abc';
      submission.implementationId = implementationId;
      expect(submission.implementationId).toBe(implementationId);
    });

    it('should set templateId property', () => {
      const templateId = '01912345-1111-7abc-def0-123456789abc';
      submission.templateId = templateId;
      expect(submission.templateId).toBe(templateId);
    });

    it('should set createdById property', () => {
      const userId = '01912345-2222-7abc-def0-123456789abc';
      submission.createdById = userId;
      expect(submission.createdById).toBe(userId);
    });
  });

  describe('target implementation group', () => {
    it('should set targetControlGroup to DSCP1', () => {
      submission.targetControlGroup = ControlGroup.DSCP1;
      expect(submission.targetControlGroup).toBe(ControlGroup.DSCP1);
    });
  });

  describe('status workflow', () => {
    it('should set status to DRAFT', () => {
      submission.status = SubmissionStatus.DRAFT;
      expect(submission.status).toBe(SubmissionStatus.DRAFT);
    });

    it('should set status to IN_PROGRESS', () => {
      submission.status = SubmissionStatus.IN_PROGRESS;
      expect(submission.status).toBe(SubmissionStatus.IN_PROGRESS);
    });

    it('should set status to COMPLETED', () => {
      submission.status = SubmissionStatus.COMPLETED;
      expect(submission.status).toBe(SubmissionStatus.COMPLETED);
    });

    it('should set status to PASSED', () => {
      submission.status = SubmissionStatus.PASSED;
      expect(submission.status).toBe(SubmissionStatus.PASSED);
    });

    it('should set status to FAILED', () => {
      submission.status = SubmissionStatus.FAILED;
      expect(submission.status).toBe(SubmissionStatus.FAILED);
    });

    it('should set status to WITHDRAWN', () => {
      submission.status = SubmissionStatus.WITHDRAWN;
      expect(submission.status).toBe(SubmissionStatus.WITHDRAWN);
    });
  });

  describe('assessor information', () => {
    it('should set assessorName property', () => {
      submission.assessorName = 'John Doe';
      expect(submission.assessorName).toBe('John Doe');
    });

    it('should allow null assessorName', () => {
      submission.assessorName = null;
      expect(submission.assessorName).toBeNull();
    });

    it('should set assessmentDate property', () => {
      const date = new Date('2024-03-15');
      submission.assessmentDate = date;
      expect(submission.assessmentDate).toEqual(date);
    });

    it('should allow null assessmentDate', () => {
      submission.assessmentDate = null;
      expect(submission.assessmentDate).toBeNull();
    });

    it('should set assessorNotes property', () => {
      submission.assessorNotes = 'Assessment notes here';
      expect(submission.assessorNotes).toBe('Assessment notes here');
    });

    it('should allow null assessorNotes', () => {
      submission.assessorNotes = null;
      expect(submission.assessorNotes).toBeNull();
    });
  });

  describe('system environment', () => {
    it('should set systemEnvironment property', () => {
      submission.systemEnvironment = 'Production - AWS';
      expect(submission.systemEnvironment).toBe('Production - AWS');
    });

    it('should allow null systemEnvironment', () => {
      submission.systemEnvironment = null;
      expect(submission.systemEnvironment).toBeNull();
    });
  });

  describe('progress tracking', () => {
    it('should set currentCategoryIndex property', () => {
      submission.currentCategoryIndex = 3;
      expect(submission.currentCategoryIndex).toBe(3);
    });

    it('should default currentCategoryIndex to undefined before persistence', () => {
      expect(submission.currentCategoryIndex).toBeUndefined();
    });
  });

  describe('scoring and certification', () => {
    it('should set totalScore property', () => {
      submission.totalScore = 85.5;
      expect(submission.totalScore).toBe(85.5);
    });

    it('should allow null totalScore', () => {
      submission.totalScore = null;
      expect(submission.totalScore).toBeNull();
    });

    it('should set certificationResult to PASS', () => {
      submission.certificationResult = CertificationResult.PASS;
      expect(submission.certificationResult).toBe(CertificationResult.PASS);
    });

    it('should set certificationResult to FAIL', () => {
      submission.certificationResult = CertificationResult.FAIL;
      expect(submission.certificationResult).toBe(CertificationResult.FAIL);
    });

    it('should allow null certificationResult', () => {
      submission.certificationResult = null;
      expect(submission.certificationResult).toBeNull();
    });

    it('should set isCertified to true', () => {
      submission.isCertified = true;
      expect(submission.isCertified).toBe(true);
    });

    it('should set isCertified to false', () => {
      submission.isCertified = false;
      expect(submission.isCertified).toBe(false);
    });

    it('should set certificateNumber property', () => {
      submission.certificateNumber = 'DHIS2-CERT-2024-001';
      expect(submission.certificateNumber).toBe('DHIS2-CERT-2024-001');
    });

    it('should allow null certificateNumber', () => {
      submission.certificateNumber = null;
      expect(submission.certificateNumber).toBeNull();
    });
  });

  describe('completion timestamps', () => {
    it('should set completedAt property', () => {
      const date = new Date('2024-03-20T10:00:00Z');
      submission.completedAt = date;
      expect(submission.completedAt).toEqual(date);
    });

    it('should allow null completedAt', () => {
      submission.completedAt = null;
      expect(submission.completedAt).toBeNull();
    });

    it('should set finalizedAt property', () => {
      const date = new Date('2024-03-21T15:00:00Z');
      submission.finalizedAt = date;
      expect(submission.finalizedAt).toEqual(date);
    });

    it('should allow null finalizedAt', () => {
      submission.finalizedAt = null;
      expect(submission.finalizedAt).toBeNull();
    });
  });

  describe('generateId', () => {
    it('should generate a UUID v7 when id is not set', () => {
      submission.generateId();
      expect(submission.id).toBeDefined();
      expect(typeof submission.id).toBe('string');
      // UUID v7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
      expect(submission.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should not overwrite existing id', () => {
      const existingId = '01234567-89ab-7def-0123-456789abcdef';
      submission.id = existingId;
      submission.generateId();
      expect(submission.id).toBe(existingId);
    });
  });

  describe('responses relationship', () => {
    it('should allow setting responses array', () => {
      submission.responses = [];
      expect(submission.responses).toEqual([]);
    });
  });

  describe('simplified workflow (no separate reviewer)', () => {
    it('should support DRAFT to IN_PROGRESS transition', () => {
      submission.status = SubmissionStatus.DRAFT;
      expect(submission.status).toBe(SubmissionStatus.DRAFT);

      submission.status = SubmissionStatus.IN_PROGRESS;
      expect(submission.status).toBe(SubmissionStatus.IN_PROGRESS);
    });

    it('should support IN_PROGRESS to COMPLETED transition', () => {
      submission.status = SubmissionStatus.IN_PROGRESS;
      submission.status = SubmissionStatus.COMPLETED;
      expect(submission.status).toBe(SubmissionStatus.COMPLETED);
    });

    it('should support COMPLETED to PASSED transition with certification', () => {
      submission.status = SubmissionStatus.COMPLETED;
      submission.status = SubmissionStatus.PASSED;
      submission.isCertified = true;
      submission.certificateNumber = 'DHIS2-CERT-2024-001';
      submission.finalizedAt = new Date();

      expect(submission.status).toBe(SubmissionStatus.PASSED);
      expect(submission.isCertified).toBe(true);
      expect(submission.certificateNumber).toBeDefined();
    });

    it('should support COMPLETED to FAILED transition for remediation', () => {
      submission.status = SubmissionStatus.COMPLETED;
      submission.status = SubmissionStatus.FAILED;
      submission.certificationResult = CertificationResult.FAIL;
      submission.assessorNotes = 'Some controls require remediation';

      expect(submission.status).toBe(SubmissionStatus.FAILED);
      expect(submission.certificationResult).toBe(CertificationResult.FAIL);
    });
  });
});
