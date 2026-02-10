import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v7 as uuidv7 } from 'uuid';
import type { Request as ExpressRequest } from 'express';

import { SubmissionsController } from '../../src/modules/submissions/submissions.controller';
import { SubmissionsService } from '../../src/modules/submissions/services/submissions.service';
import { ScoringService } from '../../src/modules/submissions/services/scoring.service';
import { Submission } from '../../src/modules/submissions/entities/submission.entity';
import { SubmissionResponse } from '../../src/modules/submissions/entities/submission-response.entity';
import { Implementation } from '../../src/modules/implementations/entities/implementation.entity';
import { AssessmentTemplate } from '../../src/modules/templates/entities/assessment-template.entity';
import { Criterion } from '../../src/modules/templates/entities/criterion.entity';
import { CertificatesService } from '../../src/modules/certificates/services/certificates.service';
import { AuditService } from '../../src/modules/audit/services/audit.service';
import { AuthenticationGuard } from '../../src/modules/iam/authentication/guards/authentication/authentication.guard';
import { RolesGuard } from '../../src/modules/iam/authorization/guards/roles.guard';
import { ActiveUserData } from '../../src/modules/iam/interfaces/active-user-data.interface';
import {
  SubmissionStatus,
  ImplementationGroup,
  CertificationResult,
  ComplianceStatus,
  ControlType,
} from '../../src/common/enums';

interface SubmissionResponseDto {
  id: string;
  implementationId: string;
  implementationName?: string;
  templateId: string;
  templateName?: string;
  targetImplementationGroup: ImplementationGroup;
  status: SubmissionStatus;
  assessorName: string | null;
  assessmentDate: string | null;
  systemEnvironment: string | null;
  currentCategoryIndex: number;
  totalScore: number | null;
  certificationResult: CertificationResult | null;
  isCertified: boolean;
  certificateNumber: string | null;
  completedAt: string | null;
  finalizedAt: string | null;
  assessorNotes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  responses?: unknown[];
}

interface SubmissionListResponse {
  data: SubmissionResponseDto[];
  total: number;
  page: number;
  limit: number;
}

describe('Submissions (e2e)', () => {
  let app: INestApplication;

  // In-memory storage
  const submissions: Map<string, Submission> = new Map();
  const submissionResponses: Map<string, SubmissionResponse> = new Map();
  const implementations: Map<string, Implementation> = new Map();
  const templates: Map<string, AssessmentTemplate> = new Map();
  const criteria: Map<string, Criterion> = new Map();

  const mockAdminUser: ActiveUserData = {
    jti: uuidv7(),
    refreshTokenId: uuidv7(),
    sub: uuidv7(),
    email: 'admin@test.com',
    roleId: 1,
    roleName: 'admin',
  };

  const mockAssessorUser: ActiveUserData = {
    jti: uuidv7(),
    refreshTokenId: uuidv7(),
    sub: uuidv7(),
    email: 'assessor@test.com',
    roleId: 2,
    roleName: 'assessor',
  };

  let currentUser: ActiveUserData = mockAdminUser;

  // Test data IDs
  let testOrgId: string;
  let testTemplateId: string;
  let testCriterionId1: string;
  let testCriterionId2: string;

  // Mock guards
  const mockAuthenticationGuard = {
    canActivate: (context: ExecutionContext): boolean => {
      const req = context
        .switchToHttp()
        .getRequest<ExpressRequest & { user?: ActiveUserData }>();
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
      }
      req.user = currentUser;
      return true;
    },
  };

  const mockRolesGuard = {
    canActivate: (context: ExecutionContext): boolean => {
      const req = context
        .switchToHttp()
        .getRequest<ExpressRequest & { user?: ActiveUserData }>();
      const user = req.user;
      if (!user) return false;

      const handler = context.getHandler();
      const requiredRoles = Reflect.getMetadata('roles', handler) as
        | string[]
        | undefined;

      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      return requiredRoles.includes(user.roleName ?? '');
    },
  };

  // Mock services
  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockCertificatesService = {
    issueCertificate: jest.fn().mockResolvedValue({
      id: uuidv7(),
      certificateNumber: 'DHIS2-CERT-001',
    }),
  };

  // Mock repositories
  let mockSubmissionRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  let mockResponseRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    upsert: jest.Mock;
  };

  let mockImplementationRepo: {
    findOne: jest.Mock;
  };

  let mockTemplateRepo: {
    findOne: jest.Mock;
  };

  let mockCriterionRepo: {
    find: jest.Mock;
  };

  // Mock query builder
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const setupTestData = () => {
    testImplementationId = uuidv7();
    const testImplementation = {
      id: testOrgId,
      name: 'Test Implementation',
      country: 'Kenya',
      contactEmail: 'test@org.com',
      dhis2InstanceUrl: 'https://dhis2.test.org',
      dhis2Version: '2.40.0',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Implementation;
    implementations.set(testOrgId, testOrg);

    // Create test template
    testTemplateId = uuidv7();
    const testTemplate = {
      id: testTemplateId,
      name: 'DHIS2 Server Certification',
      version: 1,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AssessmentTemplate;
    templates.set(testTemplateId, testTemplate);

    // Create test criteria (DSCP1 Technical controls)
    testCriterionId1 = uuidv7();
    const criterion1 = {
      id: testCriterionId1,
      code: 'CTRL-001',
      name: 'Server Security',
      controlGroup: ImplementationGroup.DSCP1,
      controlType: ControlType.TECHNICAL,
      weight: 1,
      isMandatory: true,
      isCriticalFail: false,
      category: { templateId: testTemplateId },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Criterion;
    criteria.set(testCriterionId1, criterion1);

    testCriterionId2 = uuidv7();
    const criterion2 = {
      id: testCriterionId2,
      code: 'CTRL-002',
      name: 'Data Backup',
      implementationGroup: ImplementationGroup.DSCP1,
      controlType: ControlType.TECHNICAL,
      weight: 1,
      isMandatory: true,
      isCriticalFail: false,
      category: { templateId: testTemplateId },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Criterion;
    criteria.set(testCriterionId2, criterion2);
  };

  beforeAll(async () => {
    // Setup repositories
    mockSubmissionRepo = {
      create: jest.fn().mockImplementation((data: Partial<Submission>) => {
        const submission = new Submission();
        Object.assign(submission, {
          id: uuidv7(),
          status: SubmissionStatus.DRAFT,
          currentCategoryIndex: 0,
          isCertified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          responses: [],
          ...data,
        });
        return submission;
      }),
      save: jest.fn().mockImplementation((entity: Submission) => {
        const saved = { ...entity, updatedAt: new Date() } as Submission;
        submissions.set(saved.id, saved);
        return Promise.resolve(saved);
      }),
      findOne: jest.fn().mockImplementation(({ where, relations }) => {
        const submission = submissions.get(where.id);
        if (submission && relations?.includes('responses')) {
          submission.responses = Array.from(
            submissionResponses.values(),
          ).filter((r) => r.submissionId === submission.id);
        }
        if (submission && relations?.includes('implementation')) {
          submission.implementation = implementations.get(
            submission.implementationId,
          );
        }
        if (submission && relations?.includes('template')) {
          submission.template = templates.get(submission.templateId);
        }
        return Promise.resolve(submission ?? null);
      }),
      find: jest.fn().mockImplementation(() => {
        return Promise.resolve(Array.from(submissions.values()));
      }),
      remove: jest.fn().mockImplementation((entity: Submission) => {
        submissions.delete(entity.id);
        return Promise.resolve(entity);
      }),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    mockResponseRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockImplementation(() => {
        return Promise.resolve(Array.from(submissionResponses.values()));
      }),
      upsert: jest
        .fn()
        .mockImplementation((responses: Partial<SubmissionResponse>[]) => {
          for (const r of responses) {
            const key = `${r.submissionId}-${r.criterionId}`;
            const existing = submissionResponses.get(key);
            const response = {
              id: existing?.id ?? uuidv7(),
              ...r,
              createdAt: existing?.createdAt ?? new Date(),
              updatedAt: new Date(),
            } as SubmissionResponse;
            submissionResponses.set(key, response);
          }
          return Promise.resolve({
            identifiers: [],
            generatedMaps: [],
            raw: [],
          });
        }),
    };

    mockImplementationRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(implementations.get(where.id) ?? null);
      }),
    };

    mockTemplateRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        const template = templates.get(where.id);
        if (
          template &&
          where.isPublished !== undefined &&
          template.isPublished !== where.isPublished
        ) {
          return Promise.resolve(null);
        }
        return Promise.resolve(template ?? null);
      }),
    };

    mockCriterionRepo = {
      find: jest.fn().mockImplementation(({ where }) => {
        // Handle both query patterns:
        // 1. { category: { templateId } } - for getting all criteria for a template
        // 2. { id: In([...]) } - for validating criterion IDs
        if (where.category?.templateId) {
          const results = Array.from(criteria.values()).filter(
            (c) =>
              (c.category as { templateId: string }).templateId ===
              where.category.templateId,
          );
          return Promise.resolve(results);
        }
        if (where.id) {
          // Handle In() operator - the value will be an object with _value array
          const ids = where.id._value || [where.id];
          const results = Array.from(criteria.values()).filter((c) =>
            ids.includes(c.id),
          );
          return Promise.resolve(results);
        }
        return Promise.resolve(Array.from(criteria.values()));
      }),
    };

    // Setup query builder mock
    mockQueryBuilder.getManyAndCount.mockImplementation(() => {
      const subs = Array.from(submissions.values());
      return Promise.resolve([subs, subs.length]);
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        SubmissionsService,
        ScoringService,
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionRepo,
        },
        {
          provide: getRepositoryToken(SubmissionResponse),
          useValue: mockResponseRepo,
        },
        {
          provide: getRepositoryToken(Implementation),
          useValue: mockImplementationRepo,
        },
        {
          provide: getRepositoryToken(AssessmentTemplate),
          useValue: mockTemplateRepo,
        },
        { provide: getRepositoryToken(Criterion), useValue: mockCriterionRepo },
        { provide: CertificatesService, useValue: mockCertificatesService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    })
      .overrideGuard(AuthenticationGuard)
      .useValue(mockAuthenticationGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    currentUser = mockAdminUser;
    mockAuditService.log.mockClear();
    mockCertificatesService.issueCertificate.mockClear();
    submissions.clear();
    submissionResponses.clear();
    implementations.clear();
    templates.clear();
    criteria.clear();
    setupTestData();
  });

  describe('POST /submissions', () => {
    it('should create a new assessment submission', async () => {
      const createDto = {
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        assessorName: 'Test Assessor',
      };

      const response = await request(app.getHttpServer())
        .post('/submissions')
        .set('Authorization', 'Bearer admin-token')
        .send(createDto)
        .expect(201);

      const body = response.body as SubmissionResponseDto;
      expect(body.id).toBeDefined();
      expect(body.implementationId).toBe(testImplementationId);
      expect(body.templateId).toBe(testTemplateId);
      expect(body.status).toBe(SubmissionStatus.DRAFT);
      expect(body.targetImplementationGroup).toBe(ImplementationGroup.DSCP1);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/submissions')
        .send({
          implementationId: testImplementationId,
          templateId: testTemplateId,
        })
        .expect(403);
    });

    it('should return 404 for non-existent implementation', async () => {
      await request(app.getHttpServer())
        .post('/submissions')
        .set('Authorization', 'Bearer admin-token')
        .send({
          implementationId: uuidv7(),
          templateId: testTemplateId,
        })
        .expect(404);
    });

    it('should return 404 for non-existent template', async () => {
      await request(app.getHttpServer())
        .post('/submissions')
        .set('Authorization', 'Bearer admin-token')
        .send({
          implementationId: testImplementationId,
          templateId: uuidv7(),
        })
        .expect(404);
    });
  });

  describe('GET /submissions', () => {
    beforeEach(async () => {
      // Create test submissions
      const sub1 = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.DRAFT,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(sub1);

      const sub2 = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.IN_PROGRESS,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(sub2);
    });

    it('should list all submissions', async () => {
      const response = await request(app.getHttpServer())
        .get('/submissions')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as SubmissionListResponse;
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should allow assessors to list submissions', async () => {
      currentUser = mockAssessorUser;

      const response = await request(app.getHttpServer())
        .get('/submissions')
        .set('Authorization', 'Bearer assessor-token')
        .expect(200);

      const body = response.body as SubmissionListResponse;
      expect(body.data).toHaveLength(2);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/submissions').expect(403);
    });
  });

  describe('GET /submissions/:id', () => {
    let testSubmissionId: string;

    beforeEach(async () => {
      const submission = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.IN_PROGRESS,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(submission);
      testSubmissionId = submission.id;
    });

    it('should get submission by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/submissions/${testSubmissionId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as SubmissionResponseDto;
      expect(body.id).toBe(testSubmissionId);
      expect(body.implementationId).toBe(testImplementationId);
    });

    it('should return 404 for non-existent submission', async () => {
      await request(app.getHttpServer())
        .get(`/submissions/${uuidv7()}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });

  describe('PATCH /submissions/:id/responses', () => {
    let testSubmissionId: string;

    beforeEach(async () => {
      const submission = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.DRAFT,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(submission);
      testSubmissionId = submission.id;
    });

    it('should save responses and transition to IN_PROGRESS', async () => {
      const saveDto = {
        responses: [
          {
            criterionId: testCriterionId1,
            complianceStatus: ComplianceStatus.COMPLIANT,
            findings: 'All checks passed',
          },
        ],
        currentCategoryIndex: 1,
      };

      const response = await request(app.getHttpServer())
        .patch(`/submissions/${testSubmissionId}/responses`)
        .set('Authorization', 'Bearer admin-token')
        .send(saveDto)
        .expect(200);

      const body = response.body as SubmissionResponseDto;
      expect(body.status).toBe(SubmissionStatus.IN_PROGRESS);
      expect(body.currentCategoryIndex).toBe(1);
    });

    it('should reject saving responses for finalized submission', async () => {
      // Update submission to PASSED
      const submission = submissions.get(testSubmissionId)!;
      submission.status = SubmissionStatus.PASSED;
      submissions.set(testSubmissionId, submission);

      await request(app.getHttpServer())
        .patch(`/submissions/${testSubmissionId}/responses`)
        .set('Authorization', 'Bearer admin-token')
        .send({ responses: [] })
        .expect(400);
    });
  });

  describe('POST /submissions/:id/complete', () => {
    let testSubmissionId: string;

    beforeEach(async () => {
      const submission = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.IN_PROGRESS,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(submission);
      testSubmissionId = submission.id;
    });

    it('should mark submission as completed', async () => {
      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/complete`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as SubmissionResponseDto;
      expect(body.status).toBe(SubmissionStatus.COMPLETED);
      expect(body.completedAt).toBeDefined();
    });

    it('should reject completing DRAFT submission', async () => {
      // Update submission to DRAFT
      const submission = submissions.get(testSubmissionId)!;
      submission.status = SubmissionStatus.DRAFT;
      submissions.set(testSubmissionId, submission);

      await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/complete`)
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    });
  });

  describe('POST /submissions/:id/finalize - PASS scenario', () => {
    let testSubmissionId: string;

    beforeEach(async () => {
      const submission = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.COMPLETED,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(submission);
      testSubmissionId = submission.id;

      // Add compliant responses for all criteria
      const response1: Partial<SubmissionResponse> = {
        submissionId: testSubmissionId,
        criterionId: testCriterionId1,
        complianceStatus: ComplianceStatus.COMPLIANT,
      };
      const response2: Partial<SubmissionResponse> = {
        submissionId: testSubmissionId,
        criterionId: testCriterionId2,
        complianceStatus: ComplianceStatus.COMPLIANT,
      };
      await mockResponseRepo.upsert([response1, response2]);
    });

    it('should finalize with PASS when all controls are compliant', async () => {
      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/finalize`)
        .set('Authorization', 'Bearer admin-token')
        .send({ assessorNotes: 'All controls verified' })
        .expect(200);

      const body = response.body as SubmissionResponseDto;
      expect(body.status).toBe(SubmissionStatus.PASSED);
      expect(body.certificationResult).toBe(CertificationResult.PASS);
      expect(body.isCertified).toBe(true);
      expect(body.finalizedAt).toBeDefined();
    });

    it('should call certificates service on PASS', async () => {
      await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/finalize`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(mockCertificatesService.issueCertificate).toHaveBeenCalledWith(
        testSubmissionId,
        mockAdminUser.sub,
      );
    });
  });

  describe('POST /submissions/:id/finalize - FAIL scenario', () => {
    let testSubmissionId: string;

    beforeEach(async () => {
      const submission = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.COMPLETED,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(submission);
      testSubmissionId = submission.id;

      // Add responses with one non-compliant
      const response1: Partial<SubmissionResponse> = {
        submissionId: testSubmissionId,
        criterionId: testCriterionId1,
        complianceStatus: ComplianceStatus.COMPLIANT,
      };
      const response2: Partial<SubmissionResponse> = {
        submissionId: testSubmissionId,
        criterionId: testCriterionId2,
        complianceStatus: ComplianceStatus.NON_COMPLIANT,
      };
      await mockResponseRepo.upsert([response1, response2]);
    });

    it('should finalize with FAIL when some controls are non-compliant', async () => {
      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/finalize`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as SubmissionResponseDto;
      expect(body.status).toBe(SubmissionStatus.FAILED);
      expect(body.certificationResult).toBe(CertificationResult.FAIL);
      expect(body.isCertified).toBe(false);
    });

    it('should NOT call certificates service on FAIL', async () => {
      await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/finalize`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(mockCertificatesService.issueCertificate).not.toHaveBeenCalled();
    });
  });

  describe('POST /submissions/:id/resume', () => {
    let testSubmissionId: string;

    beforeEach(async () => {
      const submission = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.FAILED,
        certificationResult: CertificationResult.FAIL,
        totalScore: 50,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(submission);
      testSubmissionId = submission.id;
    });

    it('should resume failed assessment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/resume`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as SubmissionResponseDto;
      expect(body.status).toBe(SubmissionStatus.IN_PROGRESS);
      expect(body.certificationResult).toBeNull();
      expect(body.totalScore).toBeNull();
    });

    it('should reject resuming non-failed submission', async () => {
      // Update to PASSED
      const submission = submissions.get(testSubmissionId)!;
      submission.status = SubmissionStatus.PASSED;
      submissions.set(testSubmissionId, submission);

      await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/resume`)
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    });
  });

  describe('POST /submissions/:id/withdraw', () => {
    let testSubmissionId: string;

    beforeEach(async () => {
      const submission = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.IN_PROGRESS,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(submission);
      testSubmissionId = submission.id;
    });

    it('should withdraw submission', async () => {
      const response = await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/withdraw`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as SubmissionResponseDto;
      expect(body.status).toBe(SubmissionStatus.WITHDRAWN);
    });

    it('should reject withdrawing PASSED submission', async () => {
      const submission = submissions.get(testSubmissionId)!;
      submission.status = SubmissionStatus.PASSED;
      submissions.set(testSubmissionId, submission);

      await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/withdraw`)
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    });

    it('should reject withdrawing already WITHDRAWN submission', async () => {
      const submission = submissions.get(testSubmissionId)!;
      submission.status = SubmissionStatus.WITHDRAWN;
      submissions.set(testSubmissionId, submission);

      await request(app.getHttpServer())
        .post(`/submissions/${testSubmissionId}/withdraw`)
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    });
  });

  describe('DELETE /submissions/:id', () => {
    let testSubmissionId: string;

    beforeEach(async () => {
      const submission = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.DRAFT,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(submission);
      testSubmissionId = submission.id;
    });

    it('should delete draft submission', async () => {
      await request(app.getHttpServer())
        .delete(`/submissions/${testSubmissionId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(204);

      expect(submissions.has(testSubmissionId)).toBe(false);
    });

    it('should reject deleting non-draft submission', async () => {
      const submission = submissions.get(testSubmissionId)!;
      submission.status = SubmissionStatus.IN_PROGRESS;
      submissions.set(testSubmissionId, submission);

      await request(app.getHttpServer())
        .delete(`/submissions/${testSubmissionId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    });
  });

  describe('GET /submissions/:id/summary', () => {
    let testSubmissionId: string;

    beforeEach(async () => {
      const submission = mockSubmissionRepo.create({
        implementationId: testImplementationId,
        templateId: testTemplateId,
        targetImplementationGroup: ImplementationGroup.DSCP1,
        status: SubmissionStatus.IN_PROGRESS,
        createdById: mockAdminUser.sub,
      });
      await mockSubmissionRepo.save(submission);
      testSubmissionId = submission.id;

      // Add responses
      const response1: Partial<SubmissionResponse> = {
        submissionId: testSubmissionId,
        criterionId: testCriterionId1,
        complianceStatus: ComplianceStatus.COMPLIANT,
      };
      await mockResponseRepo.upsert([response1]);
    });

    it('should return submission summary with pass/fail result', async () => {
      const response = await request(app.getHttpServer())
        .get(`/submissions/${testSubmissionId}/summary`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const body = response.body as {
        submission: SubmissionResponseDto;
        passFailResult: {
          result: CertificationResult;
          nonCompliantControls: unknown[];
          overallScore: number;
        };
        totalCriteria: number;
        answeredCriteria: number;
      };

      expect(body.submission).toBeDefined();
      expect(body.passFailResult).toBeDefined();
      expect(body.totalCriteria).toBe(2);
      expect(body.answeredCriteria).toBe(1);
    });
  });

  describe('Full Workflow E2E', () => {
    it('should complete full certification workflow: create -> save responses -> complete -> finalize (PASS)', async () => {
      // Step 1: Create submission
      const createResponse = await request(app.getHttpServer())
        .post('/submissions')
        .set('Authorization', 'Bearer admin-token')
        .send({
          implementationId: testImplementationId,
          templateId: testTemplateId,
          targetImplementationGroup: ImplementationGroup.DSCP1,
          assessorName: 'Certification Assessor',
        })
        .expect(201);

      const submissionId = (createResponse.body as SubmissionResponseDto).id;
      expect((createResponse.body as SubmissionResponseDto).status).toBe(
        SubmissionStatus.DRAFT,
      );

      // Step 2: Save compliant responses
      const saveResponse = await request(app.getHttpServer())
        .patch(`/submissions/${submissionId}/responses`)
        .set('Authorization', 'Bearer admin-token')
        .send({
          responses: [
            {
              criterionId: testCriterionId1,
              complianceStatus: ComplianceStatus.COMPLIANT,
              findings: 'Server security verified',
            },
            {
              criterionId: testCriterionId2,
              complianceStatus: ComplianceStatus.COMPLIANT,
              findings: 'Backup procedures verified',
            },
          ],
          currentCategoryIndex: 1,
        })
        .expect(200);

      expect((saveResponse.body as SubmissionResponseDto).status).toBe(
        SubmissionStatus.IN_PROGRESS,
      );

      // Step 3: Mark as completed
      const completeResponse = await request(app.getHttpServer())
        .post(`/submissions/${submissionId}/complete`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect((completeResponse.body as SubmissionResponseDto).status).toBe(
        SubmissionStatus.COMPLETED,
      );

      // Step 4: Finalize
      const finalizeResponse = await request(app.getHttpServer())
        .post(`/submissions/${submissionId}/finalize`)
        .set('Authorization', 'Bearer admin-token')
        .send({ assessorNotes: 'All DSCP1 controls verified and compliant' })
        .expect(200);

      const finalBody = finalizeResponse.body as SubmissionResponseDto;
      expect(finalBody.status).toBe(SubmissionStatus.PASSED);
      expect(finalBody.certificationResult).toBe(CertificationResult.PASS);
      expect(finalBody.isCertified).toBe(true);
      expect(mockCertificatesService.issueCertificate).toHaveBeenCalled();
    });

    it('should handle fail -> resume -> pass workflow', async () => {
      // Step 1: Create submission
      const createResponse = await request(app.getHttpServer())
        .post('/submissions')
        .set('Authorization', 'Bearer admin-token')
        .send({
          implementationId: testImplementationId,
          templateId: testTemplateId,
          targetImplementationGroup: ImplementationGroup.DSCP1,
        })
        .expect(201);

      const submissionId = (createResponse.body as SubmissionResponseDto).id;

      // Step 2: Save responses with one non-compliant
      await request(app.getHttpServer())
        .patch(`/submissions/${submissionId}/responses`)
        .set('Authorization', 'Bearer admin-token')
        .send({
          responses: [
            {
              criterionId: testCriterionId1,
              complianceStatus: ComplianceStatus.COMPLIANT,
            },
            {
              criterionId: testCriterionId2,
              complianceStatus: ComplianceStatus.NON_COMPLIANT,
              findings: 'Backup not configured',
            },
          ],
        })
        .expect(200);

      // Step 3: Complete
      await request(app.getHttpServer())
        .post(`/submissions/${submissionId}/complete`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      // Step 4: Finalize (should FAIL)
      const failResponse = await request(app.getHttpServer())
        .post(`/submissions/${submissionId}/finalize`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect((failResponse.body as SubmissionResponseDto).status).toBe(
        SubmissionStatus.FAILED,
      );
      expect(
        (failResponse.body as SubmissionResponseDto).certificationResult,
      ).toBe(CertificationResult.FAIL);

      // Step 5: Resume
      const resumeResponse = await request(app.getHttpServer())
        .post(`/submissions/${submissionId}/resume`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect((resumeResponse.body as SubmissionResponseDto).status).toBe(
        SubmissionStatus.IN_PROGRESS,
      );

      // Step 6: Update response to compliant
      await request(app.getHttpServer())
        .patch(`/submissions/${submissionId}/responses`)
        .set('Authorization', 'Bearer admin-token')
        .send({
          responses: [
            {
              criterionId: testCriterionId2,
              complianceStatus: ComplianceStatus.COMPLIANT,
              findings: 'Backup now configured',
            },
          ],
        })
        .expect(200);

      // Step 7: Complete again
      await request(app.getHttpServer())
        .post(`/submissions/${submissionId}/complete`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      // Step 8: Finalize (should PASS now)
      const passResponse = await request(app.getHttpServer())
        .post(`/submissions/${submissionId}/finalize`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect((passResponse.body as SubmissionResponseDto).status).toBe(
        SubmissionStatus.PASSED,
      );
      expect(
        (passResponse.body as SubmissionResponseDto).certificationResult,
      ).toBe(CertificationResult.PASS);
    });
  });

  describe('Audit logging', () => {
    it('should call audit service for state changes', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/submissions')
        .set('Authorization', 'Bearer admin-token')
        .send({
          implementationId: testImplementationId,
          templateId: testTemplateId,
        })
        .expect(201);

      expect(mockAuditService.log).toHaveBeenCalled();
      mockAuditService.log.mockClear();

      const submissionId = (createResponse.body as SubmissionResponseDto).id;

      await request(app.getHttpServer())
        .patch(`/submissions/${submissionId}/responses`)
        .set('Authorization', 'Bearer admin-token')
        .send({ responses: [] })
        .expect(200);

      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });
});
