import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubmissionsService } from '../services/submissions.service';
import { ScoringService } from '../services/scoring.service';
import { Submission } from '../entities/submission.entity';
import { SubmissionResponse } from '../entities/submission-response.entity';
import { Implementation } from '../../implementations/entities/implementation.entity';
import { AssessmentTemplate } from '../../templates/entities/assessment-template.entity';
import { AssessmentCategory } from '../../templates/entities/assessment-category.entity';
import { Criterion } from '../../templates/entities/criterion.entity';
import { CertificatesService } from '../../certificates/services/certificates.service';
import { AuditService, AuditEventType, AuditAction } from '../../audit';
import {
  SubmissionStatus,
  ControlGroup,
  CertificationResult,
  ComplianceStatus,
  ControlType,
} from '../../../common/enums';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { SaveResponsesDto } from '../dto/save-response.dto';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let submissionRepo: jest.Mocked<Repository<Submission>>;
  let responseRepo: jest.Mocked<Repository<SubmissionResponse>>;
  let implementationRepo: jest.Mocked<Repository<Implementation>>;
  let templateRepo: jest.Mocked<Repository<AssessmentTemplate>>;
  let criterionRepo: jest.Mocked<Repository<Criterion>>;
  let scoringService: jest.Mocked<ScoringService>;
  let certificatesService: jest.Mocked<CertificatesService>;
  let auditService: jest.Mocked<AuditService>;

  const mockUserId = 'user-123';
  const mockOrgId = 'org-123';
  const mockTemplateId = 'template-123';
  const mockSubmissionId = 'submission-123';
  const mockCriterionId = 'criterion-123';

  // Helper to create mock submission
  const createMockSubmission = (
    overrides: Partial<Submission> = {},
  ): Submission => {
    const submission = new Submission();
    submission.id = mockSubmissionId;
    submission.implementationId = mockImplementationId;
    submission.templateId = mockTemplateId;
    submission.targetControlGroup = ControlGroup.DSCP1;
    submission.status = SubmissionStatus.DRAFT;
    submission.currentCategoryIndex = 0;
    submission.createdById = mockUserId;
    submission.totalScore = null;
    submission.certificationResult = null;
    submission.isCertified = false;
    submission.assessorName = null;
    submission.assessmentDate = null;
    submission.systemEnvironment = null;
    submission.certificateNumber = null;
    submission.completedAt = null;
    submission.finalizedAt = null;
    submission.assessorNotes = null;
    submission.createdAt = new Date();
    submission.updatedAt = new Date();
    submission.responses = [];
    Object.assign(submission, overrides);
    return submission;
  };

  // Helper to create mock implementation
  const createMockImplementation = (): Implementation => {
    const implementation = new Implementation();
    implementation.id = mockImplementationId;
    implementation.name = 'Test Implementation';
    return implementation;
  };

  // Helper to create mock template
  const createMockTemplate = (
    overrides: Partial<AssessmentTemplate> = {},
  ): AssessmentTemplate => {
    const template = new AssessmentTemplate();
    template.id = mockTemplateId;
    template.name = 'Test Template';
    template.version = 1;
    template.isPublished = true;
    Object.assign(template, overrides);
    return template;
  };

  // Helper to create mock criterion
  const mockCategoryId = 'category-123';

  const createMockCategory = (
    overrides: Partial<AssessmentCategory> = {},
  ): AssessmentCategory => {
    const category = new AssessmentCategory();
    category.id = mockCategoryId;
    category.name = 'Test Category';
    category.templateId = mockTemplateId;
    category.weight = 1;
    category.sortOrder = 0;
    Object.assign(category, overrides);
    return category;
  };

  const createMockCriterion = (
    overrides: Partial<Criterion> = {},
  ): Criterion => {
    const criterion = new Criterion();
    criterion.id = mockCriterionId;
    criterion.code = 'CTRL-001';
    criterion.name = 'Test Control';
    criterion.controlGroup = ControlGroup.DSCP1;
    criterion.controlType = ControlType.TECHNICAL;
    criterion.weight = 1;
    criterion.maxScore = 100;
    criterion.category = createMockCategory();
    criterion.categoryId = mockCategoryId;
    Object.assign(criterion, overrides);
    return criterion;
  };

  // Helper to create mock response
  const createMockResponse = (
    overrides: Partial<SubmissionResponse> = {},
  ): SubmissionResponse => {
    const response = new SubmissionResponse();
    response.id = 'response-123';
    response.submissionId = mockSubmissionId;
    response.criterionId = mockCriterionId;
    response.complianceStatus = ComplianceStatus.COMPLIANT;
    response.score = 100;
    response.findings = null;
    response.evidenceNotes = null;
    response.remediationRequired = false;
    response.remediationTargetDate = null;
    response.remediationOwner = null;
    response.createdAt = new Date();
    response.updatedAt = new Date();
    Object.assign(response, overrides);
    return response;
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        ScoringService,
        {
          provide: getRepositoryToken(Submission),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(SubmissionResponse),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            upsert: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Implementation),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AssessmentTemplate),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Criterion),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: CertificatesService,
          useValue: {
            issueCertificate: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    submissionRepo = module.get(getRepositoryToken(Submission));
    responseRepo = module.get(getRepositoryToken(SubmissionResponse));
    implementationRepo = module.get(getRepositoryToken(Implementation));
    templateRepo = module.get(getRepositoryToken(AssessmentTemplate));
    criterionRepo = module.get(getRepositoryToken(Criterion));
    scoringService = module.get(ScoringService);
    certificatesService = module.get(CertificatesService);
    auditService = module.get(AuditService);

    // Spy on ScoringService methods
    jest.spyOn(scoringService, 'determinePassFail');
    jest.spyOn(scoringService, 'calculateCategoryScore');
    jest.spyOn(scoringService, 'getRequiredCgsForTarget');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateSubmissionDto = {
      implementationId: mockImplementationId,
      templateId: mockTemplateId,
      targetControlGroup: ControlGroup.DSCP1,
      assessorName: 'John Doe',
      assessmentDate: '2024-01-15',
      systemEnvironment: 'Production server',
    };

    it('should create a new submission with valid data', async () => {
      const mockImplementation = createMockImplementation();
      const mockTemplate = createMockTemplate();
      const mockSubmission = createMockSubmission({
        ...createDto,
        assessmentDate: new Date('2024-01-15'),
      });

      implementationRepo.findOne.mockResolvedValue(mockImplementation);
      templateRepo.findOne.mockResolvedValue(mockTemplate);
      submissionRepo.create.mockReturnValue(mockSubmission);
      submissionRepo.save.mockResolvedValue(mockSubmission);

      const result = await service.create(createDto, mockUserId);

      expect(result).toEqual(mockSubmission);
      expect(implementationRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockImplementationId },
      });
      expect(templateRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockTemplateId, isPublished: true },
      });
      expect(submissionRepo.create).toHaveBeenCalled();
      expect(submissionRepo.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.SUBMISSION_CREATED,
          entityType: 'Submission',
          action: AuditAction.CREATE,
        }),
        { actorId: mockUserId },
      );
    });

    it('should create submission with default DSCP1 if not specified', async () => {
      const dtoWithoutCG: CreateSubmissionDto = {
        implementationId: mockImplementationId,
        templateId: mockTemplateId,
      };

      const mockImplementation = createMockImplementation();
      const mockTemplate = createMockTemplate();
      const mockSubmission = createMockSubmission();

      implementationRepo.findOne.mockResolvedValue(mockImplementation);
      templateRepo.findOne.mockResolvedValue(mockTemplate);
      submissionRepo.create.mockReturnValue(mockSubmission);
      submissionRepo.save.mockResolvedValue(mockSubmission);

      const result = await service.create(dtoWithoutCG, mockUserId);

      expect(result.targetControlGroup).toBe(ControlGroup.DSCP1);
    });

    it('should throw NotFoundException if implementation not found', async () => {
      implementationRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if template not found', async () => {
      implementationRepo.findOne.mockResolvedValue(createMockImplementation());
      templateRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if template is not published', async () => {
      implementationRepo.findOne.mockResolvedValue(createMockImplementation());
      templateRepo.findOne.mockResolvedValue(null); // findOne with isPublished: true returns null

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all submissions with pagination', async () => {
      const mockSubmissions = [createMockSubmission(), createMockSubmission()];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockSubmissions, 2]),
      };
      submissionRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<
          Repository<Submission>['createQueryBuilder']
        >,
      );

      const result = await service.findAll({ first: 20 });

      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(21);
    });

    it('should filter by implementationId', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      submissionRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<
          Repository<Submission>['createQueryBuilder']
        >,
      );

      await service.findAll({ implementationId: mockImplementationId });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        's.implementationId = :implementationId',
        { implementationId: mockImplementationId },
      );
    });

    it('should filter by status', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      submissionRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<
          Repository<Submission>['createQueryBuilder']
        >,
      );

      await service.findAll({ status: SubmissionStatus.IN_PROGRESS });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        's.status = :status',
        { status: SubmissionStatus.IN_PROGRESS },
      );
    });

    it('should filter by both implementationId and status', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      submissionRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<
          Repository<Submission>['createQueryBuilder']
        >,
      );

      await service.findAll({
        implementationId: mockImplementationId,
        status: SubmissionStatus.DRAFT,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return submission with responses', async () => {
      const mockResponse = createMockResponse();
      const mockSubmission = createMockSubmission({
        responses: [mockResponse],
      });
      submissionRepo.findOne.mockResolvedValue(mockSubmission);

      const result = await service.findOne(mockSubmissionId);

      expect(result).toEqual(mockSubmission);
      expect(submissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockSubmissionId },
        relations: [
          'implementation',
          'template',
          'template.categories',
          'template.categories.criteria',
          'responses',
          'createdBy',
        ],
      });
    });

    it('should throw NotFoundException if submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('saveResponses', () => {
    const saveDto: SaveResponsesDto = {
      responses: [
        {
          criterionId: mockCriterionId,
          complianceStatus: ComplianceStatus.COMPLIANT,
          score: 100,
          findings: 'Control is properly implemented',
        },
      ],
    };

    it('should save responses and update status to IN_PROGRESS', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.DRAFT,
      });
      const mockCriterion = createMockCriterion();
      const mockResponse = createMockResponse();
      const savedSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
      });

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue([mockCriterion]);
      responseRepo.upsert.mockResolvedValue({
        identifiers: [{ id: 'response-123' }],
        generatedMaps: [],
        raw: [],
      });
      responseRepo.find.mockResolvedValue([mockResponse]);
      submissionRepo.save.mockResolvedValue(savedSubmission);

      const result = await service.saveResponses(
        mockSubmissionId,
        saveDto,
        mockUserId,
      );

      expect(result.status).toBe(SubmissionStatus.IN_PROGRESS);
      expect(responseRepo.upsert).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.SUBMISSION_UPDATED,
          entityType: 'Submission',
          action: AuditAction.UPDATE,
        }),
        { actorId: mockUserId },
      );
    });

    it('should throw NotFoundException if submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.saveResponses(mockSubmissionId, saveDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if submission is finalized', async () => {
      const finalizedSubmission = createMockSubmission({
        status: SubmissionStatus.PASSED,
      });
      submissionRepo.findOne.mockResolvedValue(finalizedSubmission);

      await expect(
        service.saveResponses(mockSubmissionId, saveDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if submission is withdrawn', async () => {
      const withdrawnSubmission = createMockSubmission({
        status: SubmissionStatus.WITHDRAWN,
      });
      submissionRepo.findOne.mockResolvedValue(withdrawnSubmission);

      await expect(
        service.saveResponses(mockSubmissionId, saveDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid criterion IDs', async () => {
      const mockSubmission = createMockSubmission();
      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue([]); // No criteria found

      await expect(
        service.saveResponses(mockSubmissionId, saveDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update currentCategoryIndex if provided', async () => {
      const mockSubmission = createMockSubmission();
      const mockCriterion = createMockCriterion();
      const saveWithProgress: SaveResponsesDto = {
        ...saveDto,
        currentCategoryIndex: 2,
      };
      const savedSubmission = createMockSubmission({
        currentCategoryIndex: 2,
        status: SubmissionStatus.IN_PROGRESS,
      });

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue([mockCriterion]);
      responseRepo.upsert.mockResolvedValue({
        identifiers: [],
        generatedMaps: [],
        raw: [],
      });
      responseRepo.find.mockResolvedValue([]);
      submissionRepo.save.mockResolvedValue(savedSubmission);

      const result = await service.saveResponses(
        mockSubmissionId,
        saveWithProgress,
        mockUserId,
      );

      expect(result.currentCategoryIndex).toBe(2);
    });
  });

  describe('updateProgress', () => {
    it('should update the current category index', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
      });
      const savedSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
        currentCategoryIndex: 3,
      });
      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      submissionRepo.save.mockResolvedValue(savedSubmission);

      const result = await service.updateProgress(mockSubmissionId, 3);

      expect(result.currentCategoryIndex).toBe(3);
      expect(submissionRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(service.updateProgress('nonexistent-id', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if submission is not in editable state', async () => {
      const passedSubmission = createMockSubmission({
        status: SubmissionStatus.PASSED,
      });
      submissionRepo.findOne.mockResolvedValue(passedSubmission);

      await expect(service.updateProgress(mockSubmissionId, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should mark submission as completed', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
      });
      const completedSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
        completedAt: new Date(),
      });

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      submissionRepo.save.mockResolvedValue(completedSubmission);

      const result = await service.complete(mockSubmissionId, mockUserId);

      expect(result.status).toBe(SubmissionStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.SUBMISSION_SUBMITTED,
          action: AuditAction.SUBMIT,
        }),
        { actorId: mockUserId },
      );
    });

    it('should throw NotFoundException if submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.complete('nonexistent-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if submission is not in IN_PROGRESS state', async () => {
      const draftSubmission = createMockSubmission({
        status: SubmissionStatus.DRAFT,
      });
      submissionRepo.findOne.mockResolvedValue(draftSubmission);

      await expect(
        service.complete(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if submission is already completed', async () => {
      const completedSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
      });
      submissionRepo.findOne.mockResolvedValue(completedSubmission);

      await expect(
        service.complete(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('finalize', () => {
    it('should finalize submission with PASS result and issue certificate', async () => {
      const mockResponses = [
        createMockResponse({ complianceStatus: ComplianceStatus.COMPLIANT }),
      ];
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
        responses: mockResponses,
      });
      const mockCriteria = [createMockCriterion()];

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue(mockCriteria);
      jest.spyOn(scoringService, 'determinePassFail').mockReturnValue({
        result: CertificationResult.PASS,
        nonCompliantControls: [],
        overallScore: 100,
      });
      const mockCertificate = {
        id: 'cert-123',
        certificateNumber: 'DHIS2-PASS-001',
      };
      certificatesService.issueCertificate.mockResolvedValue(
        mockCertificate as never,
      );
      submissionRepo.save.mockImplementation(async (sub) => sub as Submission);

      const result = await service.finalize(mockSubmissionId, mockUserId, {
        assessorNotes: 'All controls compliant',
      });

      expect(result.status).toBe(SubmissionStatus.PASSED);
      expect(result.certificationResult).toBe(CertificationResult.PASS);
      expect(result.isCertified).toBe(true);
      expect(scoringService.determinePassFail).toHaveBeenCalledWith(
        mockResponses,
        mockCriteria,
        mockSubmission.targetControlGroup,
      );
      expect(certificatesService.issueCertificate).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.SUBMISSION_APPROVED,
          action: AuditAction.APPROVE,
        }),
        { actorId: mockUserId },
      );
    });

    it('should finalize submission with FAIL result (no certificate)', async () => {
      const mockResponses = [
        createMockResponse({
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
        }),
      ];
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
        responses: mockResponses,
      });
      const mockCriteria = [createMockCriterion()];

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue(mockCriteria);
      jest.spyOn(scoringService, 'determinePassFail').mockReturnValue({
        result: CertificationResult.FAIL,
        nonCompliantControls: [
          {
            code: 'CTRL-001',
            name: 'Test Control',
            controlGroup: 'DSCP1',
            complianceStatus: ComplianceStatus.NON_COMPLIANT,
            isBlocker: true,
          },
        ],
        overallScore: 0,
      });
      submissionRepo.save.mockImplementation(async (sub) => sub as Submission);

      const result = await service.finalize(mockSubmissionId, mockUserId);

      expect(result.status).toBe(SubmissionStatus.FAILED);
      expect(result.certificationResult).toBe(CertificationResult.FAIL);
      expect(result.isCertified).toBe(false);
      expect(certificatesService.issueCertificate).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.SUBMISSION_REJECTED,
          action: AuditAction.REJECT,
        }),
        { actorId: mockUserId },
      );
    });

    it('should throw NotFoundException if submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.finalize('nonexistent-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if submission is not in COMPLETED state', async () => {
      const inProgressSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
      });
      submissionRepo.findOne.mockResolvedValue(inProgressSubmission);

      await expect(
        service.finalize(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if submission is already finalized', async () => {
      const passedSubmission = createMockSubmission({
        status: SubmissionStatus.PASSED,
      });
      submissionRepo.findOne.mockResolvedValue(passedSubmission);

      await expect(
        service.finalize(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set finalizedAt timestamp', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
        responses: [],
      });
      const mockCriteria = [createMockCriterion()];

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue(mockCriteria);
      jest.spyOn(scoringService, 'determinePassFail').mockReturnValue({
        result: CertificationResult.FAIL,
        nonCompliantControls: [],
        overallScore: 0,
      });
      submissionRepo.save.mockImplementation(async (sub) => sub as Submission);

      const result = await service.finalize(mockSubmissionId, mockUserId);

      expect(result.finalizedAt).toBeDefined();
    });
  });

  describe('withdraw', () => {
    it('should withdraw a draft submission', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.DRAFT,
      });
      const withdrawnSubmission = createMockSubmission({
        status: SubmissionStatus.WITHDRAWN,
      });

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      submissionRepo.save.mockResolvedValue(withdrawnSubmission);

      const result = await service.withdraw(mockSubmissionId, mockUserId);

      expect(result.status).toBe(SubmissionStatus.WITHDRAWN);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.SUBMISSION_WITHDRAWN,
          action: AuditAction.UPDATE,
        }),
        { actorId: mockUserId },
      );
    });

    it('should withdraw an in-progress submission', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
      });
      const withdrawnSubmission = createMockSubmission({
        status: SubmissionStatus.WITHDRAWN,
      });

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      submissionRepo.save.mockResolvedValue(withdrawnSubmission);

      const result = await service.withdraw(mockSubmissionId, mockUserId);

      expect(result.status).toBe(SubmissionStatus.WITHDRAWN);
    });

    it('should throw NotFoundException if submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.withdraw('nonexistent-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if submission is already finalized (PASSED)', async () => {
      const passedSubmission = createMockSubmission({
        status: SubmissionStatus.PASSED,
      });
      submissionRepo.findOne.mockResolvedValue(passedSubmission);

      await expect(
        service.withdraw(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if submission is already withdrawn', async () => {
      const withdrawnSubmission = createMockSubmission({
        status: SubmissionStatus.WITHDRAWN,
      });
      submissionRepo.findOne.mockResolvedValue(withdrawnSubmission);

      await expect(
        service.withdraw(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resumeAssessment', () => {
    it('should resume a failed submission', async () => {
      const failedSubmission = createMockSubmission({
        status: SubmissionStatus.FAILED,
        certificationResult: CertificationResult.FAIL,
      });
      const resumedSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
        certificationResult: null,
        totalScore: null,
        finalizedAt: null,
      });

      submissionRepo.findOne.mockResolvedValue(failedSubmission);
      submissionRepo.save.mockResolvedValue(resumedSubmission);

      const result = await service.resumeAssessment(
        mockSubmissionId,
        mockUserId,
      );

      expect(result.status).toBe(SubmissionStatus.IN_PROGRESS);
      expect(result.certificationResult).toBeNull();
      expect(result.totalScore).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.SUBMISSION_UPDATED,
          action: AuditAction.UPDATE,
        }),
        { actorId: mockUserId },
      );
    });

    it('should throw NotFoundException if submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resumeAssessment('nonexistent-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if submission is not in FAILED state', async () => {
      const inProgressSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
      });
      submissionRepo.findOne.mockResolvedValue(inProgressSubmission);

      await expect(
        service.resumeAssessment(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if submission is PASSED', async () => {
      const passedSubmission = createMockSubmission({
        status: SubmissionStatus.PASSED,
        certificationResult: CertificationResult.PASS,
      });
      submissionRepo.findOne.mockResolvedValue(passedSubmission);

      await expect(
        service.resumeAssessment(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSummary', () => {
    it('should return submission summary with scores and pass/fail info', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
        totalScore: 85,
        certificationResult: null,
        responses: [
          createMockResponse({ complianceStatus: ComplianceStatus.COMPLIANT }),
        ],
      });
      const mockCriteria = [createMockCriterion()];

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue(mockCriteria);
      jest.spyOn(scoringService, 'determinePassFail').mockReturnValue({
        result: CertificationResult.PASS,
        nonCompliantControls: [],
        overallScore: 100,
      });
      jest.spyOn(scoringService, 'calculateCategoryScore').mockReturnValue({
        score: 100,
        completionRate: 100,
      });

      const result = await service.getSummary(mockSubmissionId);

      expect(result).toHaveProperty('submission');
      expect(result).toHaveProperty('categoryScores');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('passesTargetCG');
      expect(result).toHaveProperty('certificationResult');
      expect(result).toHaveProperty('nonCompliantControls');
      expect(result).toHaveProperty('canResume');
      expect(result.certificationResult).toBe(CertificationResult.PASS);
      expect(result.passesTargetCG).toBe(true);
    });

    it('should throw NotFoundException if submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(service.getSummary('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate non-compliant controls for summary', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
        responses: [
          createMockResponse({
            complianceStatus: ComplianceStatus.NON_COMPLIANT,
          }),
        ],
      });
      const mockCriteria = [createMockCriterion()];

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue(mockCriteria);
      jest.spyOn(scoringService, 'determinePassFail').mockReturnValue({
        result: CertificationResult.FAIL,
        nonCompliantControls: [
          {
            code: 'CTRL-001',
            name: 'Test Control',
            controlGroup: 'DSCP1',
            complianceStatus: ComplianceStatus.NON_COMPLIANT,
            isBlocker: true,
          },
        ],
        overallScore: 0,
      });
      jest.spyOn(scoringService, 'calculateCategoryScore').mockReturnValue({
        score: 0,
        completionRate: 100,
      });

      const result = await service.getSummary(mockSubmissionId);

      expect(result.certificationResult).toBe(CertificationResult.FAIL);
      expect(result.passesTargetCG).toBe(false);
      expect(result.nonCompliantControls).toHaveLength(1);
    });

    it('should return correct completion stats', async () => {
      const mockSubmission = createMockSubmission({
        responses: [
          createMockResponse({ complianceStatus: ComplianceStatus.COMPLIANT }),
          createMockResponse({
            id: 'response-2',
            criterionId: 'criterion-2',
            complianceStatus: ComplianceStatus.NOT_TESTED,
          }),
        ],
      });
      const mockCriteria = [
        createMockCriterion(),
        createMockCriterion({ id: 'criterion-2', code: 'CTRL-002' }),
      ];

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue(mockCriteria);
      jest.spyOn(scoringService, 'determinePassFail').mockReturnValue({
        result: CertificationResult.FAIL,
        nonCompliantControls: [],
        overallScore: 50,
      });
      jest.spyOn(scoringService, 'calculateCategoryScore').mockReturnValue({
        score: 50,
        completionRate: 50,
      });

      const result = await service.getSummary(mockSubmissionId);

      // 2 total criteria, only 1 answered (NOT_TESTED counts as not answered)
      expect(result.completionRate).toBe(50); // 1/2 = 50%
    });
  });

  describe('state transitions', () => {
    it('should follow valid state flow: DRAFT -> IN_PROGRESS -> COMPLETED -> PASSED', async () => {
      // Start with DRAFT
      const draftSubmission = createMockSubmission({
        status: SubmissionStatus.DRAFT,
      });
      const inProgressSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
      });

      // Save responses transitions to IN_PROGRESS
      submissionRepo.findOne.mockResolvedValueOnce(draftSubmission);
      criterionRepo.find.mockResolvedValue([createMockCriterion()]);
      responseRepo.upsert.mockResolvedValue({
        identifiers: [],
        generatedMaps: [],
        raw: [],
      });
      responseRepo.find.mockResolvedValue([]);
      submissionRepo.save.mockResolvedValueOnce(inProgressSubmission);

      const afterSave = await service.saveResponses(
        mockSubmissionId,
        {
          responses: [
            {
              criterionId: mockCriterionId,
              complianceStatus: ComplianceStatus.COMPLIANT,
            },
          ],
        },
        mockUserId,
      );
      expect(afterSave.status).toBe(SubmissionStatus.IN_PROGRESS);

      // Complete transitions to COMPLETED
      const completedSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
        completedAt: new Date(),
      });
      submissionRepo.findOne.mockResolvedValueOnce(inProgressSubmission);
      submissionRepo.save.mockResolvedValueOnce(completedSubmission);

      const afterComplete = await service.complete(
        mockSubmissionId,
        mockUserId,
      );
      expect(afterComplete.status).toBe(SubmissionStatus.COMPLETED);

      // Finalize with PASS
      const completedWithResponses = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
        completedAt: new Date(),
        responses: [createMockResponse()],
      });
      submissionRepo.findOne.mockResolvedValueOnce(completedWithResponses);
      jest.spyOn(scoringService, 'determinePassFail').mockReturnValue({
        result: CertificationResult.PASS,
        nonCompliantControls: [],
        overallScore: 100,
      });
      certificatesService.issueCertificate.mockResolvedValue({
        id: 'cert-1',
        certificateNumber: 'DHIS2-PASS-001',
      } as never);
      submissionRepo.save.mockImplementation(async (sub) => sub as Submission);

      const afterFinalize = await service.finalize(
        mockSubmissionId,
        mockUserId,
      );
      expect(afterFinalize.status).toBe(SubmissionStatus.PASSED);
      expect(afterFinalize.certificationResult).toBe(CertificationResult.PASS);
    });

    it('should allow resuming after FAILED', async () => {
      const failedSubmission = createMockSubmission({
        status: SubmissionStatus.FAILED,
        certificationResult: CertificationResult.FAIL,
        totalScore: 50,
      });
      const resumedSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
        certificationResult: null,
        totalScore: null,
        finalizedAt: null,
      });

      submissionRepo.findOne.mockResolvedValue(failedSubmission);
      submissionRepo.save.mockResolvedValue(resumedSubmission);

      const result = await service.resumeAssessment(
        mockSubmissionId,
        mockUserId,
      );

      expect(result.status).toBe(SubmissionStatus.IN_PROGRESS);
      expect(result.certificationResult).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a draft submission', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.DRAFT,
      });
      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      submissionRepo.remove.mockResolvedValue(mockSubmission);

      await service.delete(mockSubmissionId, mockUserId);

      expect(submissionRepo.remove).toHaveBeenCalledWith(mockSubmission);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.SUBMISSION_UPDATED,
          action: AuditAction.DELETE,
        }),
        expect.objectContaining({ actorId: mockUserId }),
      );
    });

    it('should throw NotFoundException when submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('invalid-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when not in DRAFT state', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
      });
      submissionRepo.findOne.mockResolvedValue(mockSubmission);

      await expect(
        service.delete(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not allow deleting PASSED submissions', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.PASSED,
      });
      submissionRepo.findOne.mockResolvedValue(mockSubmission);

      await expect(
        service.delete(mockSubmissionId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('edge cases', () => {
    it('should handle empty responses array in saveResponses', async () => {
      const mockSubmission = createMockSubmission();
      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      responseRepo.find.mockResolvedValue([]);
      submissionRepo.save.mockResolvedValue(mockSubmission);

      const result = await service.saveResponses(
        mockSubmissionId,
        { responses: [] },
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(responseRepo.upsert).not.toHaveBeenCalled();
    });

    it('should handle submission with no responses in getSummary', async () => {
      const mockSubmission = createMockSubmission({ responses: [] });
      const mockCriteria = [createMockCriterion()];

      submissionRepo.findOne.mockResolvedValue(mockSubmission);
      criterionRepo.find.mockResolvedValue(mockCriteria);
      jest.spyOn(scoringService, 'determinePassFail').mockReturnValue({
        result: CertificationResult.FAIL,
        nonCompliantControls: [
          {
            code: 'CTRL-001',
            name: 'Test Control',
            controlGroup: 'DSCP1',
            complianceStatus: ComplianceStatus.NOT_TESTED,
            isBlocker: true,
          },
        ],
        overallScore: 0,
      });
      jest.spyOn(scoringService, 'calculateCategoryScore').mockReturnValue({
        score: 0,
        completionRate: 0,
      });

      const result = await service.getSummary(mockSubmissionId);

      expect(result.completionRate).toBe(0);
      expect(result.passesTargetCG).toBe(false);
    });
  });
});
