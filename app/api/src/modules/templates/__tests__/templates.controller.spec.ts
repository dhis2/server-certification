import { TemplatesController } from '../templates.controller';
import type { TemplatesService } from '../templates.service';
import type { TemplateLoaderService } from '../services/template-loader.service';
import type { TemplateValidatorService } from '../services/template-validator.service';
import type { TemplateRegistryService } from '../services/template-registry.service';
import type { ActiveUserData } from '../../iam/interfaces/active-user-data.interface';
import { ImportFormat } from '../dto/template-import.dto';
import { ControlGroup, ControlType } from '../../../common/enums';

const createMockTemplate = (overrides = {}) => ({
  id: 'template-123',
  name: 'Test Template',
  version: 1,
  description: 'Test description',
  isPublished: false,
  parentVersionId: null,
  effectiveFrom: null,
  effectiveTo: null,
  createdById: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  categories: [],
  ...overrides,
});

const createMockCategory = (overrides = {}) => ({
  id: 'category-123',
  templateId: 'template-123',
  name: 'Test Category',
  description: 'Test category description',
  weight: 1.0,
  sortOrder: 1,
  createdAt: new Date(),
  criteria: [],
  ...overrides,
});

const createMockCriterion = (overrides = {}) => ({
  id: 'criterion-123',
  categoryId: 'category-123',
  code: 'TC-01',
  name: 'Test Criterion',
  description: 'Test criterion',
  guidance: 'Test guidance',
  weight: 1.0,
  isMandatory: false,
  isCriticalFail: false,
  minPassingScore: 0,
  maxScore: 100,
  evidenceRequired: false,
  evidenceDescription: null,
  sortOrder: 1,
  controlGroup: ControlGroup.DSCP1,
  controlType: ControlType.TECHNICAL,
  cisMapping: null,
  verificationMethod: null,
  createdAt: new Date(),
  ...overrides,
});

const createAdminUser = () => ({
  id: 'user-123',
  email: 'admin@example.com',
});

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let mockService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    publish: jest.Mock;
    createNewVersion: jest.Mock;
    addCategory: jest.Mock;
    updateCategory: jest.Mock;
    deleteCategory: jest.Mock;
    addCriterion: jest.Mock;
    updateCriterion: jest.Mock;
    deleteCriterion: jest.Mock;
  };
  let mockLoaderService: {
    syncFromContent: jest.Mock;
    syncFromFile: jest.Mock;
    loadFromContent: jest.Mock;
    exportToYaml: jest.Mock;
    syncAllFromFiles: jest.Mock;
  };
  let mockValidatorService: {
    validate: jest.Mock;
  };
  let mockRegistryService: {
    getActiveTemplate: jest.Mock;
    getTemplateVersions: jest.Mock;
    diffVersions: jest.Mock;
    getStatistics: jest.Mock;
  };

  const mockTemplate = createMockTemplate({ isPublished: true });
  const mockCategory = createMockCategory({ templateId: mockTemplate.id });
  const mockCriterion = createMockCriterion({ categoryId: mockCategory.id });
  const mockAdmin = createAdminUser();
  const mockActiveUser: ActiveUserData = {
    sub: mockAdmin.id,
    email: mockAdmin.email,
    jti: 'jti-123',
    refreshTokenId: 'refresh-123',
    roleId: 1,
    roleName: 'admin',
  };

  beforeEach(() => {
    mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      publish: jest.fn(),
      createNewVersion: jest.fn(),
      addCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      addCriterion: jest.fn(),
      updateCriterion: jest.fn(),
      deleteCriterion: jest.fn(),
    };

    mockLoaderService = {
      syncFromContent: jest.fn(),
      syncFromFile: jest.fn(),
      loadFromContent: jest.fn(),
      exportToYaml: jest.fn(),
      syncAllFromFiles: jest.fn(),
    };

    mockValidatorService = {
      validate: jest.fn(),
    };

    mockRegistryService = {
      getActiveTemplate: jest.fn(),
      getTemplateVersions: jest.fn(),
      diffVersions: jest.fn(),
      getStatistics: jest.fn(),
    };

    controller = new TemplatesController(
      mockService as unknown as TemplatesService,
      mockLoaderService as unknown as TemplateLoaderService,
      mockValidatorService as unknown as TemplateValidatorService,
      mockRegistryService as unknown as TemplateRegistryService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return template validation configuration', () => {
      const result = controller.getConfig();

      expect(result.maxFileSize).toBe(5 * 1024 * 1024);
      expect(result.maxContentLength).toBe(5 * 1024 * 1024);
      expect(result.allowedExtensions).toContain('.yaml');
      expect(result.allowedExtensions).toContain('.yml');
      expect(result.allowedExtensions).toContain('.json');
      expect(result.allowedMimeTypes).toContain('application/json');
      expect(result.maxNameLength).toBe(255);
      expect(result.maxDescriptionLength).toBe(4000);
      expect(result.maxCriteriaPerCategory).toBe(100);
      expect(result.maxCategoriesPerTemplate).toBe(50);
    });

    it('should return all required config properties', () => {
      const result = controller.getConfig();

      const requiredProperties = [
        'maxFileSize',
        'maxContentLength',
        'allowedExtensions',
        'allowedMimeTypes',
        'maxNameLength',
        'maxDescriptionLength',
        'maxCriteriaPerCategory',
        'maxCategoriesPerTemplate',
        'maxCriterionCodeLength',
        'maxCriterionNameLength',
        'maxCriterionDescriptionLength',
        'maxGuidanceLength',
        'maxEvidenceDescriptionLength',
        'maxVerificationMethodLength',
        'maxCisMappingLength',
        'maxFilenameLength',
      ];

      for (const prop of requiredProperties) {
        expect(result).toHaveProperty(prop);
      }
    });
  });

  describe('findAll', () => {
    it('should return paginated list of templates', async () => {
      const templates = [mockTemplate];
      mockService.findAll.mockResolvedValue({
        edges: templates.map((t) => ({ node: t, cursor: t.id })),
        pageInfo: { hasNextPage: false, endCursor: null },
        totalCount: 1,
      });

      const result = await controller.findAll();

      expect(result.edges).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(mockService.findAll).toHaveBeenCalled();
    });

    it('should filter by published status', async () => {
      mockService.findAll.mockResolvedValue({
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        totalCount: 0,
      });

      await controller.findAll('true');

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ isPublished: true }),
      );
    });
  });

  describe('findOne', () => {
    it('should return template with categories and criteria', async () => {
      const templateWithRelations = {
        ...mockTemplate,
        categories: [{ ...mockCategory, criteria: [mockCriterion] }],
      };
      mockService.findOne.mockResolvedValue(templateWithRelations);

      const result = await controller.findOne(mockTemplate.id);

      expect(result.id).toBe(mockTemplate.id);
      expect(result.categories).toBeDefined();
      expect(mockService.findOne).toHaveBeenCalledWith(mockTemplate.id);
    });
  });

  describe('create', () => {
    it('should create new template', async () => {
      const createDto = {
        name: 'New Template',
        description: 'Test description',
      };
      mockService.create.mockResolvedValue({
        ...mockTemplate,
        ...createDto,
        isPublished: false,
      });

      const result = await controller.create(createDto, mockActiveUser);

      expect(result.name).toBe('New Template');
      expect(mockService.create).toHaveBeenCalledWith(
        createDto,
        mockActiveUser.sub,
      );
    });
  });

  describe('update', () => {
    it('should update template', async () => {
      const updateDto = { description: 'Updated description' };
      mockService.update.mockResolvedValue({
        ...mockTemplate,
        ...updateDto,
      });

      const result = await controller.update(mockTemplate.id, updateDto);

      expect(result.description).toBe('Updated description');
      expect(mockService.update).toHaveBeenCalledWith(
        mockTemplate.id,
        updateDto,
      );
    });
  });

  describe('publish', () => {
    it('should publish template', async () => {
      mockService.publish.mockResolvedValue({
        ...mockTemplate,
        isPublished: true,
      });

      const result = await controller.publish(mockTemplate.id);

      expect(result.isPublished).toBe(true);
      expect(mockService.publish).toHaveBeenCalledWith(mockTemplate.id);
    });
  });

  describe('createNewVersion', () => {
    it('should create new version of template', async () => {
      const newVersion = {
        ...mockTemplate,
        id: 'new-version-id',
        version: 2,
        parentVersionId: mockTemplate.id,
      };
      mockService.createNewVersion.mockResolvedValue(newVersion);

      const result = await controller.createNewVersion(
        mockTemplate.id,
        mockActiveUser,
      );

      expect(result.version).toBe(2);
      expect(result.parentVersionId).toBe(mockTemplate.id);
    });
  });

  describe('addCategory', () => {
    it('should add category to template', async () => {
      const categoryDto = {
        name: 'New Category',
        description: 'Category description',
        weight: 0.25,
        sortOrder: 1,
      };
      mockService.addCategory.mockResolvedValue({
        ...mockCategory,
        ...categoryDto,
      });

      const result = await controller.addCategory(mockTemplate.id, categoryDto);

      expect(result.name).toBe('New Category');
      expect(mockService.addCategory).toHaveBeenCalledWith(
        mockTemplate.id,
        categoryDto,
      );
    });
  });

  describe('updateCategory', () => {
    it('should update category', async () => {
      const updateDto = { name: 'Updated Category' };
      mockService.updateCategory.mockResolvedValue({
        ...mockCategory,
        ...updateDto,
      });

      const result = await controller.updateCategory(
        mockCategory.id,
        updateDto,
      );

      expect(result.name).toBe('Updated Category');
      expect(mockService.updateCategory).toHaveBeenCalledWith(
        mockCategory.id,
        updateDto,
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete category', async () => {
      mockService.deleteCategory.mockResolvedValue(undefined);

      await controller.deleteCategory(mockCategory.id);

      expect(mockService.deleteCategory).toHaveBeenCalledWith(mockCategory.id);
    });
  });

  describe('addCriterion', () => {
    it('should add criterion to category', async () => {
      const criterionDto = {
        code: 'CRIT-001',
        name: 'New Criterion',
        weight: 0.5,
        maxScore: 100,
        minPassingScore: 60,
        isMandatory: true,
        isCriticalFail: false,
        evidenceRequired: true,
        sortOrder: 1,
      };
      mockService.addCriterion.mockResolvedValue({
        ...mockCriterion,
        ...criterionDto,
      });

      const result = await controller.addCriterion(
        mockCategory.id,
        criterionDto,
      );

      expect(result.code).toBe('CRIT-001');
      expect(mockService.addCriterion).toHaveBeenCalledWith(
        mockCategory.id,
        criterionDto,
      );
    });
  });

  describe('updateCriterion', () => {
    it('should update criterion', async () => {
      const updateDto = { name: 'Updated Criterion', weight: 0.75 };
      mockService.updateCriterion.mockResolvedValue({
        ...mockCriterion,
        ...updateDto,
      });

      const result = await controller.updateCriterion(
        mockCriterion.id,
        updateDto,
      );

      expect(result.name).toBe('Updated Criterion');
      expect(result.weight).toBe(0.75);
    });
  });

  describe('deleteCriterion', () => {
    it('should delete criterion', async () => {
      mockService.deleteCriterion.mockResolvedValue(undefined);

      await controller.deleteCriterion(mockCriterion.id);

      expect(mockService.deleteCriterion).toHaveBeenCalledWith(
        mockCriterion.id,
      );
    });
  });

  describe('delete', () => {
    it('should delete unpublished template', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.delete(mockTemplate.id);

      expect(mockService.delete).toHaveBeenCalledWith(mockTemplate.id);
    });
  });

  describe('importTemplate', () => {
    it('should import template from YAML content', async () => {
      const importResult = {
        created: true,
        updated: false,
        templateId: 'new-123',
        name: 'Imported Template',
        version: 1,
        categoriesCount: 1,
        criteriaCount: 5,
      };
      mockLoaderService.syncFromContent.mockResolvedValue(importResult);

      const result = await controller.importTemplate(
        { format: ImportFormat.YAML, content: 'name: Test\nversion: 1' },
        mockActiveUser,
      );

      expect(result.created).toBe(true);
      expect(mockLoaderService.syncFromContent).toHaveBeenCalled();
    });
  });

  describe('importFromFile', () => {
    it('should import template from file', async () => {
      const importResult = {
        created: true,
        updated: false,
        templateId: 'new-123',
        name: 'Imported Template',
        version: 1,
        categoriesCount: 1,
        criteriaCount: 5,
      };
      mockLoaderService.syncFromFile.mockResolvedValue(importResult);

      const result = await controller.importFromFile(
        { filename: 'test.yaml' },
        mockActiveUser,
      );

      expect(result.created).toBe(true);
      expect(mockLoaderService.syncFromFile).toHaveBeenCalledWith(
        'test.yaml',
        mockActiveUser.sub,
      );
    });
  });

  describe('validateTemplate', () => {
    it('should validate template content', async () => {
      const definition = { name: 'Test', version: 1, categories: [] };
      mockLoaderService.loadFromContent.mockResolvedValue(definition);
      mockValidatorService.validate.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await controller.validateTemplate({
        format: ImportFormat.YAML,
        content: 'name: Test',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('exportTemplate', () => {
    it('should export template as YAML', async () => {
      mockService.findOne.mockResolvedValue(mockTemplate);
      mockLoaderService.exportToYaml.mockResolvedValue(
        'name: Test Template\nversion: 1',
      );

      const result = await controller.exportTemplate(mockTemplate.id);

      expect(result.content).toContain('name: Test Template');
      expect(result.filename).toContain('.yaml');
    });
  });

  describe('getActiveTemplate', () => {
    it('should return active template by name', async () => {
      mockRegistryService.getActiveTemplate.mockResolvedValue(mockTemplate);

      const result = await controller.getActiveTemplate('Test%20Template');

      expect(result.id).toBe(mockTemplate.id);
    });
  });

  describe('getTemplateVersions', () => {
    it('should return all versions of template', async () => {
      const versions = [
        { ...mockTemplate, version: 2 },
        { ...mockTemplate, version: 1, id: 'older' },
      ];
      mockRegistryService.getTemplateVersions.mockResolvedValue(versions);

      const result = await controller.getTemplateVersions('Test Template');

      expect(result).toHaveLength(2);
    });
  });

  describe('diffVersions', () => {
    it('should return diff between versions', async () => {
      const diff = {
        fromVersion: 1,
        toVersion: 2,
        changes: [{ type: 'added' as const, path: '/criteria/TC-02' }],
      };
      mockRegistryService.diffVersions.mockResolvedValue(diff);

      const result = await controller.diffVersions('Test Template', '1', '2');

      expect(result.changes).toHaveLength(1);
    });
  });

  describe('getStatistics', () => {
    it('should return template statistics', async () => {
      const stats = {
        totalTemplates: 5,
        publishedTemplates: 3,
        draftTemplates: 2,
        totalCategories: 15,
        totalCriteria: 150,
      };
      mockRegistryService.getStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics();

      expect(result.totalTemplates).toBe(5);
    });
  });

  describe('syncAllTemplates', () => {
    it('should sync all templates from files', async () => {
      const results = [
        {
          created: true,
          updated: false,
          templateId: 'id-1',
          name: 'T1',
          version: 1,
          categoriesCount: 1,
          criteriaCount: 5,
        },
      ];
      mockLoaderService.syncAllFromFiles.mockResolvedValue(results);

      const result = await controller.syncAllTemplates();

      expect(result).toHaveLength(1);
    });
  });
});
