import { SubmissionResponse } from '../entities/submission-response.entity';
import { ComplianceStatus } from '../../../common/enums';

describe('SubmissionResponse Entity', () => {
  let response: SubmissionResponse;

  beforeEach(() => {
    response = new SubmissionResponse();
  });

  describe('basic properties', () => {
    it('should set submissionId property', () => {
      const submissionId = '01912345-0000-7abc-def0-123456789abc';
      response.submissionId = submissionId;
      expect(response.submissionId).toBe(submissionId);
    });

    it('should set criterionId property', () => {
      const criterionId = '01912345-1111-7abc-def0-123456789abc';
      response.criterionId = criterionId;
      expect(response.criterionId).toBe(criterionId);
    });
  });

  describe('compliance status', () => {
    it('should set complianceStatus to COMPLIANT', () => {
      response.complianceStatus = ComplianceStatus.COMPLIANT;
      expect(response.complianceStatus).toBe(ComplianceStatus.COMPLIANT);
    });

    it('should set complianceStatus to PARTIALLY_COMPLIANT', () => {
      response.complianceStatus = ComplianceStatus.PARTIALLY_COMPLIANT;
      expect(response.complianceStatus).toBe(
        ComplianceStatus.PARTIALLY_COMPLIANT,
      );
    });

    it('should set complianceStatus to NON_COMPLIANT', () => {
      response.complianceStatus = ComplianceStatus.NON_COMPLIANT;
      expect(response.complianceStatus).toBe(ComplianceStatus.NON_COMPLIANT);
    });

    it('should set complianceStatus to NOT_APPLICABLE', () => {
      response.complianceStatus = ComplianceStatus.NOT_APPLICABLE;
      expect(response.complianceStatus).toBe(ComplianceStatus.NOT_APPLICABLE);
    });

    it('should set complianceStatus to NOT_TESTED', () => {
      response.complianceStatus = ComplianceStatus.NOT_TESTED;
      expect(response.complianceStatus).toBe(ComplianceStatus.NOT_TESTED);
    });
  });

  describe('scoring', () => {
    it('should set score property', () => {
      response.score = 85.5;
      expect(response.score).toBe(85.5);
    });

    it('should allow null score', () => {
      response.score = null;
      expect(response.score).toBeNull();
    });

    it('should handle decimal precision in score', () => {
      response.score = 92.1234;
      expect(response.score).toBe(92.1234);
    });
  });

  describe('findings and evidence', () => {
    it('should set findings property', () => {
      response.findings =
        'Control is properly implemented with strong authentication';
      expect(response.findings).toBe(
        'Control is properly implemented with strong authentication',
      );
    });

    it('should allow null findings', () => {
      response.findings = null;
      expect(response.findings).toBeNull();
    });

    it('should set evidenceNotes property', () => {
      response.evidenceNotes = 'Screenshot of MFA configuration attached';
      expect(response.evidenceNotes).toBe(
        'Screenshot of MFA configuration attached',
      );
    });

    it('should allow null evidenceNotes', () => {
      response.evidenceNotes = null;
      expect(response.evidenceNotes).toBeNull();
    });
  });

  describe('remediation tracking', () => {
    it('should set remediationRequired to true', () => {
      response.remediationRequired = true;
      expect(response.remediationRequired).toBe(true);
    });

    it('should set remediationRequired to false', () => {
      response.remediationRequired = false;
      expect(response.remediationRequired).toBe(false);
    });

    it('should default remediationRequired to undefined before persistence', () => {
      expect(response.remediationRequired).toBeUndefined();
    });

    it('should set remediationTargetDate property', () => {
      const date = new Date('2024-06-30');
      response.remediationTargetDate = date;
      expect(response.remediationTargetDate).toEqual(date);
    });

    it('should allow null remediationTargetDate', () => {
      response.remediationTargetDate = null;
      expect(response.remediationTargetDate).toBeNull();
    });

    it('should set remediationOwner property', () => {
      response.remediationOwner = 'John Doe - IT Security';
      expect(response.remediationOwner).toBe('John Doe - IT Security');
    });

    it('should allow null remediationOwner', () => {
      response.remediationOwner = null;
      expect(response.remediationOwner).toBeNull();
    });
  });

  describe('generateId', () => {
    it('should generate a UUID v7 when id is not set', () => {
      response.generateId();
      expect(response.id).toBeDefined();
      expect(typeof response.id).toBe('string');
      // UUID v7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
      expect(response.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should not overwrite existing id', () => {
      const existingId = '01234567-89ab-7def-0123-456789abcdef';
      response.id = existingId;
      response.generateId();
      expect(response.id).toBe(existingId);
    });
  });

  describe('relationships', () => {
    it('should allow setting submission relationship', () => {
      response.submission = undefined;
      expect(response.submission).toBeUndefined();
    });

    it('should allow setting criterion relationship', () => {
      response.criterion = undefined;
      expect(response.criterion).toBeUndefined();
    });
  });

  describe('unique constraint documentation', () => {
    it('should document uniqueness on submissionId and criterionId combination', () => {
      // This test documents the expected unique constraint
      // The actual enforcement happens at the database level
      // A submission should have only one response per criterion
      const submissionId = '01912345-0000-7abc-def0-123456789abc';
      const criterionId = '01912345-1111-7abc-def0-123456789abc';

      response.submissionId = submissionId;
      response.criterionId = criterionId;

      expect(response.submissionId).toBe(submissionId);
      expect(response.criterionId).toBe(criterionId);
    });
  });

  describe('compliance assessment workflow', () => {
    it('should support marking a control as compliant', () => {
      response.submissionId = '01912345-0000-7abc-def0-123456789abc';
      response.criterionId = '01912345-1111-7abc-def0-123456789abc';
      response.complianceStatus = ComplianceStatus.COMPLIANT;
      response.score = 100;
      response.findings = 'All security controls properly implemented';
      response.evidenceNotes = 'Verified through system audit';
      response.remediationRequired = false;

      expect(response.complianceStatus).toBe(ComplianceStatus.COMPLIANT);
      expect(response.score).toBe(100);
      expect(response.remediationRequired).toBe(false);
    });

    it('should support marking a control as non-compliant requiring remediation', () => {
      response.submissionId = '01912345-0000-7abc-def0-123456789abc';
      response.criterionId = '01912345-1111-7abc-def0-123456789abc';
      response.complianceStatus = ComplianceStatus.NON_COMPLIANT;
      response.score = 0;
      response.findings = 'MFA not enabled for admin accounts';
      response.evidenceNotes =
        'User management screen shows single-factor auth only';
      response.remediationRequired = true;
      response.remediationTargetDate = new Date('2024-06-30');
      response.remediationOwner = 'IT Security Team';

      expect(response.complianceStatus).toBe(ComplianceStatus.NON_COMPLIANT);
      expect(response.remediationRequired).toBe(true);
      expect(response.remediationTargetDate).toBeDefined();
      expect(response.remediationOwner).toBe('IT Security Team');
    });

    it('should support marking a control as not applicable', () => {
      response.complianceStatus = ComplianceStatus.NOT_APPLICABLE;
      response.findings =
        'This control is not applicable - no mobile access configured';
      response.remediationRequired = false;

      expect(response.complianceStatus).toBe(ComplianceStatus.NOT_APPLICABLE);
      expect(response.remediationRequired).toBe(false);
    });
  });
});
