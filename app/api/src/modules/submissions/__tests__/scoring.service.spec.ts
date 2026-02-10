import { ScoringService } from '../services/scoring.service';
import {
  ComplianceStatus,
  ControlGroup,
  CertificationResult,
  ControlType,
} from '../../../common/enums';
import { SubmissionResponse } from '../entities/submission-response.entity';
import { Criterion } from '../../templates/entities/criterion.entity';

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService();
  });

  // Helper to create a mock criterion
  const createCriterion = (overrides: Partial<Criterion> = {}): Criterion => {
    const criterion = new Criterion();
    criterion.id = overrides.id ?? 'criterion-1';
    criterion.code = overrides.code ?? 'DB-01';
    criterion.name = overrides.name ?? 'Test Control';
    criterion.controlGroup = overrides.controlGroup ?? ControlGroup.DSCP1;
    criterion.controlType = overrides.controlType ?? ControlType.TECHNICAL;
    criterion.weight = overrides.weight ?? 1;
    criterion.categoryId = overrides.categoryId ?? 'cat-1';
    criterion.description = overrides.description ?? null;
    criterion.guidance = overrides.guidance ?? null;
    criterion.isMandatory = overrides.isMandatory ?? false;
    criterion.isCriticalFail = overrides.isCriticalFail ?? false;
    criterion.minPassingScore = overrides.minPassingScore ?? 0;
    criterion.maxScore = overrides.maxScore ?? 100;
    criterion.evidenceRequired = overrides.evidenceRequired ?? false;
    criterion.evidenceDescription = overrides.evidenceDescription ?? null;
    criterion.sortOrder = overrides.sortOrder ?? 1;
    criterion.cisMapping = overrides.cisMapping ?? null;
    criterion.verificationMethod = overrides.verificationMethod ?? null;
    criterion.createdAt = overrides.createdAt ?? new Date();
    return criterion;
  };

  // Helper to create a mock response
  const createResponse = (
    criterionId: string,
    status: ComplianceStatus,
    overrides: Partial<SubmissionResponse> = {},
  ): SubmissionResponse => {
    const response = new SubmissionResponse();
    response.id = overrides.id ?? 'response-1';
    response.submissionId = overrides.submissionId ?? 'submission-1';
    response.criterionId = criterionId;
    response.complianceStatus = status;
    response.score = overrides.score ?? null;
    response.findings = overrides.findings ?? null;
    response.evidenceNotes = overrides.evidenceNotes ?? null;
    response.remediationRequired = overrides.remediationRequired ?? false;
    response.remediationTargetDate = overrides.remediationTargetDate ?? null;
    response.remediationOwner = overrides.remediationOwner ?? null;
    response.createdAt = overrides.createdAt ?? new Date();
    response.updatedAt = overrides.updatedAt ?? new Date();
    return response;
  };

  describe('getRequiredCgsForTarget', () => {
    it('should return DSCP1 for target DSCP1', () => {
      const result = service.getRequiredCgsForTarget(ControlGroup.DSCP1);
      expect(result).toEqual([ControlGroup.DSCP1]);
    });

    it('should default to DSCP1 for unknown target', () => {
      // Using type assertion to test edge case
      const result = service.getRequiredCgsForTarget('UNKNOWN' as ControlGroup);
      expect(result).toEqual([ControlGroup.DSCP1]);
    });
  });

  describe('calculateCategoryScore', () => {
    it('should return score of 100 when all criteria are COMPLIANT', () => {
      const criteria = [
        createCriterion({ id: 'c1', weight: 1 }),
        createCriterion({ id: 'c2', weight: 1 }),
      ];
      const responses = [
        createResponse('c1', ComplianceStatus.COMPLIANT),
        createResponse('c2', ComplianceStatus.COMPLIANT),
      ];

      const result = service.calculateCategoryScore(responses, criteria);

      expect(result.score).toBe(100);
      expect(result.completionRate).toBe(100);
    });

    it('should return score of 0 when all criteria are NON_COMPLIANT', () => {
      const criteria = [
        createCriterion({ id: 'c1', weight: 1 }),
        createCriterion({ id: 'c2', weight: 1 }),
      ];
      const responses = [
        createResponse('c1', ComplianceStatus.NON_COMPLIANT),
        createResponse('c2', ComplianceStatus.NON_COMPLIANT),
      ];

      const result = service.calculateCategoryScore(responses, criteria);

      expect(result.score).toBe(0);
      expect(result.completionRate).toBe(100);
    });

    it('should return score of 50 when all criteria are PARTIALLY_COMPLIANT', () => {
      const criteria = [
        createCriterion({ id: 'c1', weight: 1 }),
        createCriterion({ id: 'c2', weight: 1 }),
      ];
      const responses = [
        createResponse('c1', ComplianceStatus.PARTIALLY_COMPLIANT),
        createResponse('c2', ComplianceStatus.PARTIALLY_COMPLIANT),
      ];

      const result = service.calculateCategoryScore(responses, criteria);

      expect(result.score).toBe(50);
      expect(result.completionRate).toBe(100);
    });

    it('should calculate weighted average correctly', () => {
      const criteria = [
        createCriterion({ id: 'c1', weight: 2 }), // weight 2
        createCriterion({ id: 'c2', weight: 1 }), // weight 1
      ];
      const responses = [
        createResponse('c1', ComplianceStatus.COMPLIANT), // 100 * 2 = 200
        createResponse('c2', ComplianceStatus.NON_COMPLIANT), // 0 * 1 = 0
      ];

      // Weighted average: (200 + 0) / (2 + 1) = 66.67
      const result = service.calculateCategoryScore(responses, criteria);

      expect(result.score).toBeCloseTo(66.67, 1);
    });

    it('should exclude NOT_APPLICABLE criteria from score calculation', () => {
      const criteria = [
        createCriterion({ id: 'c1', weight: 1 }),
        createCriterion({ id: 'c2', weight: 1 }),
      ];
      const responses = [
        createResponse('c1', ComplianceStatus.COMPLIANT), // 100 * 1 = 100
        createResponse('c2', ComplianceStatus.NOT_APPLICABLE), // Excluded
      ];

      // Only c1 counted: 100 / 1 = 100
      const result = service.calculateCategoryScore(responses, criteria);

      expect(result.score).toBe(100);
    });

    it('should handle NOT_TESTED as score 0', () => {
      const criteria = [
        createCriterion({ id: 'c1', weight: 1 }),
        createCriterion({ id: 'c2', weight: 1 }),
      ];
      const responses = [
        createResponse('c1', ComplianceStatus.COMPLIANT), // 100 * 1 = 100
        createResponse('c2', ComplianceStatus.NOT_TESTED), // 0 * 1 = 0
      ];

      const result = service.calculateCategoryScore(responses, criteria);

      expect(result.score).toBe(50);
    });

    it('should calculate completion rate correctly', () => {
      const criteria = [
        createCriterion({ id: 'c1' }),
        createCriterion({ id: 'c2' }),
        createCriterion({ id: 'c3' }),
        createCriterion({ id: 'c4' }),
      ];
      const responses = [
        createResponse('c1', ComplianceStatus.COMPLIANT),
        createResponse('c2', ComplianceStatus.NON_COMPLIANT),
        createResponse('c3', ComplianceStatus.NOT_TESTED), // Not answered
        // c4 has no response - defaults to NOT_TESTED
      ];

      const result = service.calculateCategoryScore(responses, criteria);

      // 2 out of 4 answered (c1, c2), c3 and c4 are NOT_TESTED
      expect(result.completionRate).toBe(50);
    });

    it('should return 0 score when no criteria exist', () => {
      const result = service.calculateCategoryScore([], []);

      expect(result.score).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    it('should handle missing responses (default to NOT_TESTED)', () => {
      const criteria = [
        createCriterion({ id: 'c1', weight: 1 }),
        createCriterion({ id: 'c2', weight: 1 }),
      ];
      const responses = [
        createResponse('c1', ComplianceStatus.COMPLIANT),
        // c2 has no response - should default to NOT_TESTED (0 score)
      ];

      const result = service.calculateCategoryScore(responses, criteria);

      // (100 + 0) / 2 = 50
      expect(result.score).toBe(50);
      expect(result.completionRate).toBe(50);
    });
  });

  describe('determinePassFail', () => {
    describe('Target DSCP1', () => {
      it('should return PASS when all DSCP1 technical controls are COMPLIANT', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
          createCriterion({
            id: 'c2',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.COMPLIANT),
          createResponse('c2', ComplianceStatus.COMPLIANT),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.result).toBe(CertificationResult.PASS);
        expect(result.nonCompliantControls).toHaveLength(0);
      });

      it('should return FAIL when any DSCP1 technical control is NON_COMPLIANT', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            code: 'DB-01',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
          createCriterion({
            id: 'c2',
            code: 'DB-02',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.COMPLIANT),
          createResponse('c2', ComplianceStatus.NON_COMPLIANT),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.result).toBe(CertificationResult.FAIL);
        expect(result.nonCompliantControls).toHaveLength(1);
        expect(result.nonCompliantControls[0].code).toBe('DB-02');
        expect(result.nonCompliantControls[0].isBlocker).toBe(true);
      });

      it('should return FAIL when DSCP1 technical control is NOT_TESTED', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
        ];
        const responses = [createResponse('c1', ComplianceStatus.NOT_TESTED)];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.result).toBe(CertificationResult.FAIL);
        expect(result.nonCompliantControls).toHaveLength(1);
      });

      it('should return FAIL when DSCP1 technical control is PARTIALLY_COMPLIANT', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.PARTIALLY_COMPLIANT),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.result).toBe(CertificationResult.FAIL);
        expect(result.nonCompliantControls).toHaveLength(1);
      });

      it('should PASS when DSCP1 technical control is NOT_APPLICABLE', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.NOT_APPLICABLE),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.result).toBe(CertificationResult.PASS);
        expect(result.nonCompliantControls).toHaveLength(0);
      });

      it('should ignore organizational controls for pass/fail determination', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
          createCriterion({
            id: 'c2',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.ORGANIZATIONAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.COMPLIANT),
          createResponse('c2', ComplianceStatus.NON_COMPLIANT), // Should NOT affect result
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.result).toBe(CertificationResult.PASS);
        expect(result.nonCompliantControls).toHaveLength(0);
      });
    });

    describe('Overall score calculation', () => {
      it('should calculate overall score correctly for all COMPLIANT', () => {
        const criteria = [
          createCriterion({ id: 'c1', controlType: ControlType.TECHNICAL }),
          createCriterion({ id: 'c2', controlType: ControlType.TECHNICAL }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.COMPLIANT),
          createResponse('c2', ComplianceStatus.COMPLIANT),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.overallScore).toBe(100);
      });

      it('should calculate overall score correctly for mixed statuses', () => {
        const criteria = [
          createCriterion({ id: 'c1', controlType: ControlType.TECHNICAL }),
          createCriterion({ id: 'c2', controlType: ControlType.TECHNICAL }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.COMPLIANT), // 100
          createResponse('c2', ComplianceStatus.NON_COMPLIANT), // 0
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.overallScore).toBe(50);
      });

      it('should exclude NOT_APPLICABLE from score calculation', () => {
        const criteria = [
          createCriterion({ id: 'c1', controlType: ControlType.TECHNICAL }),
          createCriterion({ id: 'c2', controlType: ControlType.TECHNICAL }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.COMPLIANT), // 100
          createResponse('c2', ComplianceStatus.NOT_APPLICABLE), // Excluded
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.overallScore).toBe(100);
      });

      it('should return 0 score when no scorable criteria', () => {
        const criteria = [
          createCriterion({ id: 'c1', controlType: ControlType.TECHNICAL }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.NOT_APPLICABLE),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.overallScore).toBe(0);
      });
    });

    describe('Non-compliant controls tracking', () => {
      it('should track all non-compliant controls', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            code: 'DB-01',
            name: 'Database Control 1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
          createCriterion({
            id: 'c2',
            code: 'DB-02',
            name: 'Database Control 2',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
          createCriterion({
            id: 'c3',
            code: 'OS-01',
            name: 'OS Control 1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.NON_COMPLIANT),
          createResponse('c2', ComplianceStatus.COMPLIANT),
          createResponse('c3', ComplianceStatus.NOT_TESTED),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.nonCompliantControls).toHaveLength(2);
        expect(result.nonCompliantControls.map((c) => c.code).sort()).toEqual([
          'DB-01',
          'OS-01',
        ]);
      });

      it('should include control details in non-compliant list', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            code: 'DB-01',
            name: 'Database Encryption',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.NON_COMPLIANT),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.nonCompliantControls[0]).toEqual({
          code: 'DB-01',
          name: 'Database Encryption',
          controlGroup: 'DSCP1',
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          isBlocker: true,
        });
      });

      it('should not include organizational controls in non-compliant list', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            code: 'DB-01',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
          createCriterion({
            id: 'c2',
            code: 'ORG-01',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.ORGANIZATIONAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.COMPLIANT),
          createResponse('c2', ComplianceStatus.NON_COMPLIANT),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.nonCompliantControls).toHaveLength(0);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty criteria list', () => {
        const result = service.determinePassFail([], [], ControlGroup.DSCP1);

        expect(result.result).toBe(CertificationResult.PASS);
        expect(result.nonCompliantControls).toHaveLength(0);
        expect(result.overallScore).toBe(0);
      });

      it('should handle no technical controls (all organizational)', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.ORGANIZATIONAL,
          }),
          createCriterion({
            id: 'c2',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.ORGANIZATIONAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.NON_COMPLIANT),
          createResponse('c2', ComplianceStatus.NON_COMPLIANT),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        // No technical controls to fail, so it's a PASS
        expect(result.result).toBe(CertificationResult.PASS);
      });

      it('should handle missing responses (default to NOT_TESTED which fails)', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
        ];
        const responses: SubmissionResponse[] = []; // No responses

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.result).toBe(CertificationResult.FAIL);
        expect(result.nonCompliantControls).toHaveLength(1);
      });

      it('should handle all criteria as NOT_APPLICABLE', () => {
        const criteria = [
          createCriterion({
            id: 'c1',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
          createCriterion({
            id: 'c2',
            controlGroup: ControlGroup.DSCP1,
            controlType: ControlType.TECHNICAL,
          }),
        ];
        const responses = [
          createResponse('c1', ComplianceStatus.NOT_APPLICABLE),
          createResponse('c2', ComplianceStatus.NOT_APPLICABLE),
        ];

        const result = service.determinePassFail(
          responses,
          criteria,
          ControlGroup.DSCP1,
        );

        expect(result.result).toBe(CertificationResult.PASS);
        expect(result.overallScore).toBe(0);
      });
    });
  });
});
