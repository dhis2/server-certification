import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Submission } from '../entities/submission.entity';
import { SubmissionResponse } from '../entities/submission-response.entity';
import { Implementation } from '../../implementations/entities/implementation.entity';
import { AssessmentTemplate } from '../../templates/entities/assessment-template.entity';
import { Criterion } from '../../templates/entities/criterion.entity';
import { CertificatesService } from '../../certificates/services/certificates.service';
import { AuditService, AuditEventType, AuditAction } from '../../audit';
import { ScoringService } from './scoring.service';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { SaveResponsesDto } from '../dto/save-response.dto';
import { FinalizeSubmissionDto } from '../dto/finalize-submission.dto';
import {
  SubmissionStatus,
  ControlGroup,
  CertificationResult,
  ComplianceStatus,
} from '../../../common/enums';
import {
  Connection,
  CursorPaginationOptions,
  paginate,
} from 'src/shared/pagination';

export interface FindAllOptions extends CursorPaginationOptions {
  implementationId?: string;
  status?: SubmissionStatus;
}

export type SubmissionsConnection = Connection<Submission>;

export interface CategoryScore {
  categoryId: string;
  categoryName: string;
  score: number;
  completionRate: number;
}

export interface NonCompliantControlInfo {
  code: string;
  name: string;
  controlGroup: string;
  complianceStatus: ComplianceStatus;
  isBlocker: boolean;
}

export interface SubmissionSummary {
  submission: Submission;
  categoryScores: CategoryScore[];
  overallScore: number;
  completionRate: number;
  passesTargetCG: boolean;
  certificationResult: CertificationResult | null;
  nonCompliantControls: NonCompliantControlInfo[];
  canResume: boolean;
}

/**
 * SubmissionsService handles all submission-related operations
 *
 * Workflow: DRAFT → IN_PROGRESS → COMPLETED → PASSED/FAILED
 *
 * - DRAFT: Initial state when submission is created
 * - IN_PROGRESS: Assessment is being conducted (responses being saved)
 * - COMPLETED: Assessment completed, ready for finalization
 * - PASSED: All required controls compliant, certificate issued
 * - FAILED: Some required controls non-compliant, can resume after remediation
 * - WITHDRAWN: Assessment withdrawn
 */
@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(SubmissionResponse)
    private readonly responseRepo: Repository<SubmissionResponse>,
    @InjectRepository(Implementation)
    private readonly implementationRepo: Repository<Implementation>,
    @InjectRepository(AssessmentTemplate)
    private readonly templateRepo: Repository<AssessmentTemplate>,
    @InjectRepository(Criterion)
    private readonly criterionRepo: Repository<Criterion>,
    private readonly scoringService: ScoringService,
    private readonly certificatesService: CertificatesService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSubmissionDto, userId: string): Promise<Submission> {
    const implementation = await this.implementationRepo.findOne({
      where: { id: dto.implementationId },
    });
    if (!implementation) {
      throw new NotFoundException(
        `Implementation ${dto.implementationId} not found`,
      );
    }

    const template = await this.templateRepo.findOne({
      where: { id: dto.templateId, isPublished: true },
    });
    if (!template) {
      throw new NotFoundException(
        `Template ${dto.templateId} not found or not published`,
      );
    }

    const submission = this.submissionRepo.create({
      implementationId: dto.implementationId,
      templateId: dto.templateId,
      targetControlGroup: dto.targetControlGroup ?? ControlGroup.DSCP1,
      assessorName: dto.assessorName ?? null,
      assessmentDate: dto.assessmentDate ? new Date(dto.assessmentDate) : null,
      systemEnvironment: dto.systemEnvironment ?? null,
      status: SubmissionStatus.DRAFT,
      createdById: userId,
    });

    const saved = await this.submissionRepo.save(submission);

    await this.auditService.log(
      {
        eventType: AuditEventType.SUBMISSION_CREATED,
        entityType: 'Submission',
        entityId: saved.id,
        action: AuditAction.CREATE,
        newValues: {
          implementationId: saved.implementationId,
          templateId: saved.templateId,
          targetControlGroup: saved.targetControlGroup,
          status: saved.status,
        },
      },
      { actorId: userId },
    );

    this.logger.log(
      `Submission ${saved.id} created for implementation ${dto.implementationId}`,
    );

    return saved;
  }

  async findAll(options: FindAllOptions = {}): Promise<SubmissionsConnection> {
    const qb = this.submissionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.implementation', 'implementation')
      .leftJoinAndSelect('s.template', 'template');

    if (options.implementationId) {
      qb.where('s.implementationId = :implementationId', {
        implementationId: options.implementationId,
      });
    }

    if (options.status) {
      const method = options.implementationId ? 'andWhere' : 'where';
      qb[method]('s.status = :status', { status: options.status });
    }

    return paginate(qb, 's', {
      first: options.first,
      after: options.after,
      sortDirection: 'DESC',
    });
  }

  async findOne(id: string): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: [
        'implementation',
        'template',
        'template.categories',
        'template.categories.criteria',
        'responses',
        'createdBy',
      ],
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    if (submission.template?.categories) {
      submission.template.categories.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const category of submission.template.categories) {
        if (category.criteria) {
          category.criteria.sort((a, b) => a.sortOrder - b.sortOrder);
        }
      }
    }

    return submission;
  }

  async saveResponses(
    id: string,
    dto: SaveResponsesDto,
    userId: string,
  ): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    if (!this.isEditableState(submission.status)) {
      throw new BadRequestException(
        `Cannot save responses for submission in ${submission.status} state`,
      );
    }

    if (dto.responses.length > 0) {
      const criterionIds = dto.responses.map((r) => r.criterionId);
      const validCriteria = await this.criterionRepo.find({
        where: { id: In(criterionIds) },
      });

      if (validCriteria.length !== criterionIds.length) {
        const validIds = new Set(validCriteria.map((c) => c.id));
        const invalidIds = criterionIds.filter((cid) => !validIds.has(cid));
        throw new BadRequestException(
          `Invalid criterion IDs: ${invalidIds.join(', ')}`,
        );
      }

      // Fetch existing responses to get their IDs - needed for upsert
      // TypeORM's @BeforeInsert hook doesn't run during upsert operations,
      // so we must provide the id explicitly
      const existingResponses = await this.responseRepo.find({
        where: {
          submissionId: id,
          criterionId: In(criterionIds),
        },
        select: ['id', 'criterionId'],
      });

      const existingResponseMap = new Map(
        existingResponses.map((r) => [r.criterionId, r.id]),
      );

      await this.responseRepo.upsert(
        dto.responses.map((r) => ({
          id: existingResponseMap.get(r.criterionId) ?? uuidv7(),
          submissionId: id,
          criterionId: r.criterionId,
          complianceStatus: r.complianceStatus,
          score: r.score ?? null,
          findings: r.findings ?? null,
          evidenceNotes: r.evidenceNotes ?? null,
          remediationRequired: r.remediationRequired ?? false,
          remediationTargetDate: r.remediationTargetDate
            ? new Date(r.remediationTargetDate)
            : null,
          remediationOwner: r.remediationOwner ?? null,
        })),
        ['submissionId', 'criterionId'],
      );
    }

    if (submission.status === SubmissionStatus.DRAFT) {
      submission.status = SubmissionStatus.IN_PROGRESS;
    }

    if (dto.currentCategoryIndex !== undefined) {
      submission.currentCategoryIndex = dto.currentCategoryIndex;
    }

    const saved = await this.submissionRepo.save(submission);

    await this.auditService.log(
      {
        eventType: AuditEventType.SUBMISSION_UPDATED,
        entityType: 'Submission',
        entityId: saved.id,
        action: AuditAction.UPDATE,
        newValues: {
          status: saved.status,
          currentCategoryIndex: saved.currentCategoryIndex,
          responsesCount: dto.responses.length,
        },
      },
      { actorId: userId },
    );

    return saved;
  }

  async updateProgress(id: string, categoryIndex: number): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    if (!this.isEditableState(submission.status)) {
      throw new BadRequestException(
        `Cannot update progress for submission in ${submission.status} state`,
      );
    }

    submission.currentCategoryIndex = categoryIndex;
    return this.submissionRepo.save(submission);
  }

  async complete(id: string, userId: string): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    if (submission.status !== SubmissionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot complete submission in ${submission.status} state. Must be IN_PROGRESS.`,
      );
    }

    submission.status = SubmissionStatus.COMPLETED;
    submission.completedAt = new Date();

    const saved = await this.submissionRepo.save(submission);

    await this.auditService.log(
      {
        eventType: AuditEventType.SUBMISSION_SUBMITTED,
        entityType: 'Submission',
        entityId: saved.id,
        action: AuditAction.SUBMIT,
        newValues: {
          status: saved.status,
          completedAt: saved.completedAt,
        },
      },
      { actorId: userId },
    );

    this.logger.log(`Submission ${id} marked as completed`);

    return saved;
  }

  async finalize(
    id: string,
    userId: string,
    dto?: FinalizeSubmissionDto,
  ): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: ['responses'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    if (submission.status !== SubmissionStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot finalize submission in ${submission.status} state. Must be COMPLETED.`,
      );
    }

    const criteria = await this.criterionRepo.find({
      where: { category: { templateId: submission.templateId } },
      relations: ['category'],
    });

    const passFailResult = this.scoringService.determinePassFail(
      submission.responses,
      criteria,
      submission.targetControlGroup,
    );

    submission.totalScore = passFailResult.overallScore;
    submission.certificationResult = passFailResult.result;
    submission.finalizedAt = new Date();
    submission.assessorNotes = dto?.assessorNotes ?? null;

    if (passFailResult.result === CertificationResult.PASS) {
      submission.status = SubmissionStatus.PASSED;
      submission.isCertified = true;

      const saved = await this.submissionRepo.save(submission);

      await this.certificatesService.issueCertificate(id, userId);

      await this.auditService.log(
        {
          eventType: AuditEventType.SUBMISSION_APPROVED,
          entityType: 'Submission',
          entityId: saved.id,
          action: AuditAction.APPROVE,
          newValues: {
            status: saved.status,
            certificationResult: saved.certificationResult,
            totalScore: saved.totalScore,
            isCertified: saved.isCertified,
          },
        },
        { actorId: userId },
      );

      this.logger.log(
        `Submission ${id} finalized with PASS result, certificate issued`,
      );

      return saved;
    } else {
      submission.status = SubmissionStatus.FAILED;
      submission.isCertified = false;

      const saved = await this.submissionRepo.save(submission);

      await this.auditService.log(
        {
          eventType: AuditEventType.SUBMISSION_REJECTED,
          entityType: 'Submission',
          entityId: saved.id,
          action: AuditAction.REJECT,
          newValues: {
            status: saved.status,
            certificationResult: saved.certificationResult,
            totalScore: saved.totalScore,
            nonCompliantControls: passFailResult.nonCompliantControls.map(
              (c) => c.code,
            ),
          },
        },
        { actorId: userId },
      );

      this.logger.log(
        `Submission ${id} finalized with FAIL result, ${passFailResult.nonCompliantControls.length} non-compliant controls`,
      );

      return saved;
    }
  }

  async withdraw(id: string, userId: string): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    if (
      submission.status === SubmissionStatus.PASSED ||
      submission.status === SubmissionStatus.WITHDRAWN
    ) {
      throw new BadRequestException(
        `Cannot withdraw submission in ${submission.status} state`,
      );
    }

    const previousStatus = submission.status;
    submission.status = SubmissionStatus.WITHDRAWN;

    const saved = await this.submissionRepo.save(submission);

    await this.auditService.log(
      {
        eventType: AuditEventType.SUBMISSION_WITHDRAWN,
        entityType: 'Submission',
        entityId: saved.id,
        action: AuditAction.UPDATE,
        oldValues: { status: previousStatus },
        newValues: { status: saved.status },
      },
      { actorId: userId },
    );

    this.logger.log(`Submission ${id} withdrawn`);

    return saved;
  }

  async resumeAssessment(id: string, userId: string): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    if (submission.status !== SubmissionStatus.FAILED) {
      throw new BadRequestException(
        `Cannot resume submission in ${submission.status} state. Must be FAILED.`,
      );
    }

    submission.status = SubmissionStatus.IN_PROGRESS;
    submission.certificationResult = null;
    submission.totalScore = null;
    submission.finalizedAt = null;

    const saved = await this.submissionRepo.save(submission);

    await this.auditService.log(
      {
        eventType: AuditEventType.SUBMISSION_UPDATED,
        entityType: 'Submission',
        entityId: saved.id,
        action: AuditAction.UPDATE,
        newValues: {
          status: saved.status,
          message: 'Assessment resumed after remediation',
        },
      },
      { actorId: userId },
    );

    this.logger.log(`Submission ${id} resumed for remediation`);

    return saved;
  }

  async getSummary(id: string): Promise<SubmissionSummary> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: ['responses', 'implementation', 'template'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    const criteria = await this.criterionRepo.find({
      where: { category: { templateId: submission.templateId } },
      relations: ['category'],
    });

    const passFailResult = this.scoringService.determinePassFail(
      submission.responses,
      criteria,
      submission.targetControlGroup,
    );

    const answeredCriteria = submission.responses.filter(
      (r) => r.complianceStatus !== ComplianceStatus.NOT_TESTED,
    ).length;
    const totalCriteria = criteria.length;
    const completionRate =
      totalCriteria > 0 ? (answeredCriteria / totalCriteria) * 100 : 0;

    const categoryMap = new Map<
      string,
      { name: string; criteria: Criterion[] }
    >();
    for (const criterion of criteria) {
      const catId = criterion.category.id;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          name: criterion.category.name,
          criteria: [],
        });
      }
      categoryMap.get(catId)!.criteria.push(criterion);
    }

    const categoryScores: CategoryScore[] = [];
    for (const [
      categoryId,
      { name, criteria: categoryCriteria },
    ] of categoryMap) {
      const categoryResult = this.scoringService.calculateCategoryScore(
        submission.responses,
        categoryCriteria,
      );
      categoryScores.push({
        categoryId,
        categoryName: name,
        score: categoryResult.score,
        completionRate: categoryResult.completionRate,
      });
    }

    const canResume =
      submission.status === SubmissionStatus.FAILED ||
      (submission.status === SubmissionStatus.COMPLETED &&
        passFailResult.result === CertificationResult.FAIL);

    return {
      submission,
      categoryScores,
      overallScore: passFailResult.overallScore,
      completionRate,
      passesTargetCG: passFailResult.result === CertificationResult.PASS,
      certificationResult: passFailResult.result,
      nonCompliantControls: passFailResult.nonCompliantControls,
      canResume,
    };
  }

  async delete(id: string, userId: string): Promise<void> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    if (submission.status !== SubmissionStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot delete submission in ${submission.status} state. Must be DRAFT.`,
      );
    }

    await this.submissionRepo.remove(submission);

    await this.auditService.log(
      {
        eventType: AuditEventType.SUBMISSION_UPDATED,
        entityType: 'Submission',
        entityId: id,
        action: AuditAction.DELETE,
        oldValues: {
          implementationId: submission.implementationId,
          templateId: submission.templateId,
          status: submission.status,
        },
      },
      { actorId: userId },
    );

    this.logger.log(`Submission ${id} deleted`);
  }

  private isEditableState(status: SubmissionStatus): boolean {
    return (
      status === SubmissionStatus.DRAFT ||
      status === SubmissionStatus.IN_PROGRESS
    );
  }
}
