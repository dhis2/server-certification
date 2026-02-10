import { Injectable } from '@nestjs/common';
import { SubmissionResponse } from '../entities/submission-response.entity';
import { Criterion } from '../../templates/entities/criterion.entity';
import {
  ComplianceStatus,
  ControlGroup,
  CertificationResult,
  ControlType,
} from '../../../common/enums';

export interface NonCompliantControl {
  code: string;
  name: string;
  controlGroup: string;
  complianceStatus: ComplianceStatus;
  isBlocker: boolean;
}

export interface PassFailResult {
  result: CertificationResult;
  nonCompliantControls: NonCompliantControl[];
  overallScore: number;
}

export interface CategoryScoreResult {
  score: number;
  completionRate: number;
}

/**
 * ScoringService handles the scoring logic for DSCP assessments.
 *
 * Pass/Fail Rules (binary outcome):
 * - ALL DSCP1 Technical controls must be COMPLIANT → PASS
 * - Organizational controls are INFORMATIVE ONLY (do not affect pass/fail)
 *
 * COMPLIANT = passes
 * NOT_APPLICABLE = passes (excluded from calculation)
 * PARTIALLY_COMPLIANT, NON_COMPLIANT, NOT_TESTED = fails
 */
@Injectable()
export class ScoringService {
  private getStatusScore(status: ComplianceStatus): number {
    switch (status) {
      case ComplianceStatus.COMPLIANT:
        return 100;
      case ComplianceStatus.PARTIALLY_COMPLIANT:
        return 50;
      case ComplianceStatus.NON_COMPLIANT:
      case ComplianceStatus.NOT_TESTED:
        return 0;
      case ComplianceStatus.NOT_APPLICABLE:
        return -1;
      default:
        return 0;
    }
  }

  getRequiredCgsForTarget(targetCG: ControlGroup): ControlGroup[] {
    if (targetCG === ControlGroup.DSCP1) {
      return [ControlGroup.DSCP1];
    }

    return [ControlGroup.DSCP1];
  }

  calculateCategoryScore(
    responses: SubmissionResponse[],
    criteria: Criterion[],
  ): CategoryScoreResult {
    let totalWeight = 0;
    let weightedScore = 0;
    let answered = 0;

    for (const criterion of criteria) {
      const response = responses.find((r) => r.criterionId === criterion.id);
      const status = response?.complianceStatus ?? ComplianceStatus.NOT_TESTED;
      const score = this.getStatusScore(status);

      // Skip NOT_APPLICABLE from score calculation
      if (score >= 0) {
        totalWeight += criterion.weight;
        weightedScore += score * criterion.weight;
      }

      // Track completion (anything except NOT_TESTED is "answered")
      if (status !== ComplianceStatus.NOT_TESTED) {
        answered++;
      }
    }

    return {
      score: totalWeight > 0 ? weightedScore / totalWeight : 0,
      completionRate:
        criteria.length > 0 ? (answered / criteria.length) * 100 : 0,
    };
  }

  determinePassFail(
    responses: SubmissionResponse[],
    criteria: Criterion[],
    targetCG: ControlGroup,
  ): PassFailResult {
    const requiredCgs = this.getRequiredCgsForTarget(targetCG);
    const nonCompliantControls: NonCompliantControl[] = [];
    let totalScore = 0;
    let scoredCount = 0;

    for (const criterion of criteria) {
      const response = responses.find((r) => r.criterionId === criterion.id);
      const status = response?.complianceStatus ?? ComplianceStatus.NOT_TESTED;
      const score = this.getStatusScore(status);

      if (score >= 0) {
        totalScore += score;
        scoredCount++;
      }

      const isRequiredCG = requiredCgs.includes(criterion.controlGroup);
      const isTechnical = criterion.controlType === ControlType.TECHNICAL;
      const isCompliant = status === ComplianceStatus.COMPLIANT;
      const isNA = status === ComplianceStatus.NOT_APPLICABLE;

      // Technical controls in required CGs must be COMPLIANT (or N/A)
      if (isRequiredCG && isTechnical && !isCompliant && !isNA) {
        nonCompliantControls.push({
          code: criterion.code,
          name: criterion.name,
          controlGroup: criterion.controlGroup,
          complianceStatus: status,
          isBlocker: true, // Technical controls block certification
        });
      }
    }

    const overallScore = scoredCount > 0 ? totalScore / scoredCount : 0;
    const result =
      nonCompliantControls.length === 0
        ? CertificationResult.PASS
        : CertificationResult.FAIL;

    return {
      result,
      nonCompliantControls,
      overallScore,
    };
  }
}
