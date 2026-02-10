import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubmissionsController } from '../submissions.controller';
import { SubmissionsService, SubmissionSummary } from '../services';
import { Submission } from '../entities/submission.entity';
import { SubmissionResponse } from '../entities/submission-response.entity';
import { ActiveUserData } from '../../iam/interfaces/active-user-data.interface';
import {
  SubmissionStatus,
  ControlGroup,
  CertificationResult,
  ComplianceStatus,
} from '../../../common/enums';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { SaveResponsesDto } from '../dto/save-response.dto';
import { FinalizeSubmissionDto } from '../dto/finalize-submission.dto';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  let mockService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    getSummary: jest.Mock;
    saveResponses: jest.Mock;
    complete: jest.Mock;
    finalize: jest.Mock;
    resumeAssessment: jest.Mock;
    withdraw: jest.Mock;
    delete: jest.Mock;
  };

  const mockUserId = 'user-123';
  const mockSubmissionId = 'submission-123';
  const mockOrgId = 'org-123';
  const mockTemplateId = 'template-123';

  // Mock active user
  const mockActiveUser: ActiveUserData = {
    sub: mockUserId,
    email: 'admin@example.com',
    jti: 'jwt-id-123',
    refreshTokenId: 'refresh-123',
    roleId: 1,
    roleName: 'admin',
  };

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

  // Helper to create mock response
  const createMockResponse = (
    overrides: Partial<SubmissionResponse> = {},
  ): SubmissionResponse => {
    const response = new SubmissionResponse();
    response.id = 'response-123';
    response.submissionId = mockSubmissionId;
    response.criterionId = 'criterion-123';
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

  beforeEach(() => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getSummary: jest.fn(),
      saveResponses: jest.fn(),
      complete: jest.fn(),
      finalize: jest.fn(),
      resumeAssessment: jest.fn(),
      withdraw: jest.fn(),
      delete: jest.fn(),
    };

    controller = new SubmissionsController(
      mockService as unknown as SubmissionsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create (POST /submissions)', () => {
    const createDto: CreateSubmissionDto = {
      implementationId: mockImplementationId,
      templateId: mockTemplateId,
      targetControlGroup: ControlGroup.DSCP1,
      assessorName: 'Test Assessor',
    };

    it('should create a new submission', async () => {
      const mockSubmission = createMockSubmission({
        assessorName: 'Test Assessor',
      });
      mockService.create.mockResolvedValue(mockSubmission);

      const result = await controller.create(createDto, mockActiveUser);

      expect(result.id).toBe(mockSubmissionId);
      expect(result.implementationId).toBe(mockImplementationId);
      expect(mockService.create).toHaveBeenCalledWith(createDto, mockUserId);
    });

    it('should pass user ID from active user to service', async () => {
      const mockSubmission = createMockSubmission();
      mockService.create.mockResolvedValue(mockSubmission);

      await controller.create(createDto, mockActiveUser);

      expect(mockService.create).toHaveBeenCalledWith(
        createDto,
        mockActiveUser.sub,
      );
    });

    it('should throw when implementation not found', async () => {
      mockService.create.mockRejectedValue(
        new NotFoundException('Implementation not found'),
      );

      await expect(
        controller.create(createDto, mockActiveUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll (GET /submissions)', () => {
    it('should return paginated list of submissions', async () => {
      const mockSubmissions = [
        createMockSubmission(),
        createMockSubmission({ id: 'submission-456' }),
      ];
      mockService.findAll.mockResolvedValue({
        edges: mockSubmissions.map((s) => ({ node: s, cursor: s.id })),
        pageInfo: { hasNextPage: false, endCursor: null },
        totalCount: 2,
      });

      const result = await controller.findAll();

      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(mockService.findAll).toHaveBeenCalled();
    });

    it('should filter by implementation ID', async () => {
      mockService.findAll.mockResolvedValue({
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        totalCount: 0,
      });

      await controller.findAll(mockImplementationId);

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ implementationId: mockImplementationId }),
      );
    });

    it('should filter by status', async () => {
      mockService.findAll.mockResolvedValue({
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        totalCount: 0,
      });

      await controller.findAll(undefined, SubmissionStatus.IN_PROGRESS);

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: SubmissionStatus.IN_PROGRESS }),
      );
    });

    it('should handle pagination', async () => {
      mockService.findAll.mockResolvedValue({
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        totalCount: 0,
      });

      await controller.findAll(undefined, undefined, '20', 'some-cursor');

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ first: 20, after: 'some-cursor' }),
      );
    });
  });

  describe('findOne (GET /submissions/:id)', () => {
    it('should return submission with responses', async () => {
      const mockSubmission = createMockSubmission({
        responses: [createMockResponse()],
      });
      mockService.findOne.mockResolvedValue(mockSubmission);

      const result = await controller.findOne(mockSubmissionId);

      expect(result.id).toBe(mockSubmissionId);
      expect(result.responses).toBeDefined();
      expect(mockService.findOne).toHaveBeenCalledWith(mockSubmissionId);
    });

    it('should throw NotFoundException when not found', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Submission not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSummary (GET /submissions/:id/summary)', () => {
    it('should return submission summary with pass/fail result', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
      });
      const mockSummary: SubmissionSummary = {
        submission: mockSubmission,
        categoryScores: [],
        overallScore: 100,
        completionRate: 100,
        passesTargetCG: true,
        certificationResult: CertificationResult.PASS,
        nonCompliantControls: [],
        canResume: false,
      };
      mockService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(mockSubmissionId);

      expect(result.submission.id).toBe(mockSubmissionId);
      expect(result.certificationResult).toBe(CertificationResult.PASS);
      expect(result.completionRate).toBe(100);
      expect(mockService.getSummary).toHaveBeenCalledWith(mockSubmissionId);
    });

    it('should include non-compliant controls in result', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.FAILED,
      });
      const mockSummary: SubmissionSummary = {
        submission: mockSubmission,
        categoryScores: [],
        overallScore: 50,
        completionRate: 100,
        passesTargetCG: false,
        certificationResult: CertificationResult.FAIL,
        nonCompliantControls: [
          {
            code: 'CTRL-001',
            name: 'Test Control',
            controlGroup: ControlGroup.DSCP1,
            complianceStatus: ComplianceStatus.NON_COMPLIANT,
            isBlocker: true,
          },
        ],
        canResume: true,
      };
      mockService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(mockSubmissionId);

      expect(result.certificationResult).toBe(CertificationResult.FAIL);
      expect(result.nonCompliantControls).toHaveLength(1);
    });
  });

  describe('saveResponses (PATCH /submissions/:id/responses)', () => {
    const saveResponsesDto: SaveResponsesDto = {
      responses: [
        {
          criterionId: 'criterion-123',
          complianceStatus: ComplianceStatus.COMPLIANT,
          findings: 'All checks passed',
        },
      ],
      currentCategoryIndex: 1,
    };

    it('should save responses and return updated submission', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
        currentCategoryIndex: 1,
      });
      mockService.saveResponses.mockResolvedValue(mockSubmission);

      const result = await controller.saveResponses(
        mockSubmissionId,
        saveResponsesDto,
        mockActiveUser,
      );

      expect(result.status).toBe(SubmissionStatus.IN_PROGRESS);
      expect(result.currentCategoryIndex).toBe(1);
      expect(mockService.saveResponses).toHaveBeenCalledWith(
        mockSubmissionId,
        saveResponsesDto,
        mockUserId,
      );
    });

    it('should throw when submission not in editable state', async () => {
      mockService.saveResponses.mockRejectedValue(
        new BadRequestException(
          'Cannot save responses for submission in PASSED state',
        ),
      );

      await expect(
        controller.saveResponses(
          mockSubmissionId,
          saveResponsesDto,
          mockActiveUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when criterion ID is invalid', async () => {
      mockService.saveResponses.mockRejectedValue(
        new BadRequestException('Invalid criterion IDs: invalid-criterion'),
      );

      await expect(
        controller.saveResponses(
          mockSubmissionId,
          saveResponsesDto,
          mockActiveUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete (POST /submissions/:id/complete)', () => {
    it('should mark submission as completed', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.COMPLETED,
        completedAt: new Date(),
      });
      mockService.complete.mockResolvedValue(mockSubmission);

      const result = await controller.complete(
        mockSubmissionId,
        mockActiveUser,
      );

      expect(result.status).toBe(SubmissionStatus.COMPLETED);
      expect(mockService.complete).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
      );
    });

    it('should throw when not in IN_PROGRESS state', async () => {
      mockService.complete.mockRejectedValue(
        new BadRequestException('Cannot complete submission in DRAFT state'),
      );

      await expect(
        controller.complete(mockSubmissionId, mockActiveUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('finalize (POST /submissions/:id/finalize)', () => {
    const finalizeDto: FinalizeSubmissionDto = {
      assessorNotes: 'Assessment completed successfully',
    };

    it('should finalize submission with PASS result', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.PASSED,
        certificationResult: CertificationResult.PASS,
        isCertified: true,
        totalScore: 100,
        finalizedAt: new Date(),
      });
      mockService.finalize.mockResolvedValue(mockSubmission);

      const result = await controller.finalize(
        mockSubmissionId,
        mockActiveUser,
        finalizeDto,
      );

      expect(result.status).toBe(SubmissionStatus.PASSED);
      expect(result.certificationResult).toBe(CertificationResult.PASS);
      expect(result.isCertified).toBe(true);
      expect(mockService.finalize).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
        finalizeDto,
      );
    });

    it('should finalize submission with FAIL result', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.FAILED,
        certificationResult: CertificationResult.FAIL,
        isCertified: false,
        totalScore: 50,
        finalizedAt: new Date(),
      });
      mockService.finalize.mockResolvedValue(mockSubmission);

      const result = await controller.finalize(
        mockSubmissionId,
        mockActiveUser,
        finalizeDto,
      );

      expect(result.status).toBe(SubmissionStatus.FAILED);
      expect(result.certificationResult).toBe(CertificationResult.FAIL);
      expect(result.isCertified).toBe(false);
    });

    it('should throw when not in COMPLETED state', async () => {
      mockService.finalize.mockRejectedValue(
        new BadRequestException(
          'Cannot finalize submission in IN_PROGRESS state',
        ),
      );

      await expect(
        controller.finalize(mockSubmissionId, mockActiveUser, finalizeDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept finalize without assessor notes', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.PASSED,
        certificationResult: CertificationResult.PASS,
      });
      mockService.finalize.mockResolvedValue(mockSubmission);

      const result = await controller.finalize(
        mockSubmissionId,
        mockActiveUser,
      );

      expect(result.status).toBe(SubmissionStatus.PASSED);
      expect(mockService.finalize).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
        undefined,
      );
    });
  });

  describe('resumeAssessment (POST /submissions/:id/resume)', () => {
    it('should resume failed assessment', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.IN_PROGRESS,
        certificationResult: null,
        totalScore: null,
      });
      mockService.resumeAssessment.mockResolvedValue(mockSubmission);

      const result = await controller.resumeAssessment(
        mockSubmissionId,
        mockActiveUser,
      );

      expect(result.status).toBe(SubmissionStatus.IN_PROGRESS);
      expect(result.certificationResult).toBeNull();
      expect(mockService.resumeAssessment).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
      );
    });

    it('should throw when not in FAILED state', async () => {
      mockService.resumeAssessment.mockRejectedValue(
        new BadRequestException('Cannot resume submission in DRAFT state'),
      );

      await expect(
        controller.resumeAssessment(mockSubmissionId, mockActiveUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('withdraw (POST /submissions/:id/withdraw)', () => {
    it('should withdraw submission', async () => {
      const mockSubmission = createMockSubmission({
        status: SubmissionStatus.WITHDRAWN,
      });
      mockService.withdraw.mockResolvedValue(mockSubmission);

      const result = await controller.withdraw(
        mockSubmissionId,
        mockActiveUser,
      );

      expect(result.status).toBe(SubmissionStatus.WITHDRAWN);
      expect(mockService.withdraw).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
      );
    });

    it('should throw when already passed', async () => {
      mockService.withdraw.mockRejectedValue(
        new BadRequestException('Cannot withdraw submission in PASSED state'),
      );

      await expect(
        controller.withdraw(mockSubmissionId, mockActiveUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when already withdrawn', async () => {
      mockService.withdraw.mockRejectedValue(
        new BadRequestException(
          'Cannot withdraw submission in WITHDRAWN state',
        ),
      );

      await expect(
        controller.withdraw(mockSubmissionId, mockActiveUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete (DELETE /submissions/:id)', () => {
    it('should delete draft submission', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.delete(mockSubmissionId, mockActiveUser);

      expect(mockService.delete).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
      );
    });

    it('should throw when not in DRAFT state', async () => {
      mockService.delete.mockRejectedValue(
        new BadRequestException(
          'Cannot delete submission in IN_PROGRESS state',
        ),
      );

      await expect(
        controller.delete(mockSubmissionId, mockActiveUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when submission not found', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException('Submission not found'),
      );

      await expect(
        controller.delete('invalid-id', mockActiveUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('response DTO transformation', () => {
    it('should transform submission entity to response DTO', async () => {
      const mockSubmission = createMockSubmission({
        assessorName: 'Test Assessor',
        assessmentDate: new Date('2024-01-15'),
        systemEnvironment: 'Production',
        completedAt: new Date(),
        finalizedAt: new Date(),
      });
      mockService.findOne.mockResolvedValue(mockSubmission);

      const result = await controller.findOne(mockSubmissionId);

      expect(result.id).toBe(mockSubmissionId);
      expect(result.assessorName).toBe('Test Assessor');
      expect(result.assessmentDate).toBeDefined();
      expect(result.systemEnvironment).toBe('Production');
    });

    it('should include implementation and template names when available', async () => {
      const mockSubmission = createMockSubmission();
      mockSubmission.implementation = {
        id: mockOrgId,
        name: 'Test Implementation',
      } as any;
      mockSubmission.template = {
        id: mockTemplateId,
        name: 'Test Template',
      } as any;
      mockService.findOne.mockResolvedValue(mockSubmission);

      const result = await controller.findOne(mockSubmissionId);

      expect(result.implementation?.name).toBe('Test Implementation');
      expect(result.template?.name).toBe('Test Template');
    });
  });

  describe('list response pagination', () => {
    it('should return correct page number', async () => {
      mockService.findAll.mockResolvedValue([[], 0]);

      const result = await controller.findAll(undefined, undefined, '3', '10');

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
    });

    it('should default to page 1 and limit 20', async () => {
      mockService.findAll.mockResolvedValue([[], 0]);

      const result = await controller.findAll();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('authorization context', () => {
    it('should pass user ID to all write operations', async () => {
      const mockSubmission = createMockSubmission();
      mockService.create.mockResolvedValue(mockSubmission);
      mockService.saveResponses.mockResolvedValue(mockSubmission);
      mockService.complete.mockResolvedValue(mockSubmission);
      mockService.finalize.mockResolvedValue(mockSubmission);
      mockService.resumeAssessment.mockResolvedValue(mockSubmission);
      mockService.withdraw.mockResolvedValue(mockSubmission);
      mockService.delete.mockResolvedValue(undefined);

      await controller.create({} as CreateSubmissionDto, mockActiveUser);
      expect(mockService.create).toHaveBeenCalledWith(
        expect.anything(),
        mockUserId,
      );

      await controller.saveResponses(
        mockSubmissionId,
        { responses: [] },
        mockActiveUser,
      );
      expect(mockService.saveResponses).toHaveBeenCalledWith(
        mockSubmissionId,
        expect.anything(),
        mockUserId,
      );

      await controller.complete(mockSubmissionId, mockActiveUser);
      expect(mockService.complete).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
      );

      await controller.finalize(mockSubmissionId, mockActiveUser);
      expect(mockService.finalize).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
        undefined,
      );

      await controller.resumeAssessment(mockSubmissionId, mockActiveUser);
      expect(mockService.resumeAssessment).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
      );

      await controller.withdraw(mockSubmissionId, mockActiveUser);
      expect(mockService.withdraw).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
      );

      await controller.delete(mockSubmissionId, mockActiveUser);
      expect(mockService.delete).toHaveBeenCalledWith(
        mockSubmissionId,
        mockUserId,
      );
    });
  });
});
