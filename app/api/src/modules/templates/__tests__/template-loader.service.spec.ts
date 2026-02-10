import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TemplateLoaderService } from '../services/template-loader.service';
import { TemplateValidatorService } from '../services/template-validator.service';
import { TemplatesService } from '../templates.service';
import { ControlType, ControlGroup } from '../../../common/enums';

const createMockTemplate = (overrides = {}) => ({
  id: 'template-123',
  name: 'Test Template',
  version: 1,
  description: 'Test description',
  isPublished: true,
  categories: [
    {
      id: 'cat-1',
      name: 'Category 1',
      description: 'Cat desc',
      weight: 1.0,
      sortOrder: 1,
      criteria: [
        {
          id: 'crit-1',
          code: 'TC-01',
          name: 'Test Criterion',
          description: 'Desc',
          guidance: 'Guidance',
          verificationMethod: 'Method',
          weight: 1.0,
          isMandatory: true,
          isCriticalFail: false,
          minPassingScore: 0,
          maxScore: 100,
          evidenceRequired: true,
          evidenceDescription: 'Evidence',
          sortOrder: 1,
          controlGroup: ControlGroup.DSCP1,
          controlType: ControlType.TECHNICAL,
          cisMapping: '1.1',
        },
      ],
    },
  ],
  ...overrides,
});

describe('TemplateLoaderService', () => {
  let service: TemplateLoaderService;
  let mockConfigService: { get: jest.Mock };
  let mockValidator: {
    validate: jest.Mock;
    loadSchema: jest.Mock;
  };
  let mockTemplatesService: {
    findOne: jest.Mock;
    findPublishedByName: jest.Mock;
    create: jest.Mock;
    publish: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue: unknown) => {
          if (key === 'TEMPLATES_PATH') return '/tmp/templates';
          if (key === 'TEMPLATES_AUTO_SYNC') return false;
          return defaultValue;
        }),
    };

    mockValidator = {
      validate: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
      loadSchema: jest.fn().mockResolvedValue(undefined),
    };

    mockTemplatesService = {
      findOne: jest.fn().mockResolvedValue(createMockTemplate()),
      findPublishedByName: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockResolvedValue(createMockTemplate({ id: 'new-123' })),
      publish: jest
        .fn()
        .mockResolvedValue(createMockTemplate({ isPublished: true })),
    };

    service = new TemplateLoaderService(
      mockConfigService as unknown as ConfigService,
      mockValidator as unknown as TemplateValidatorService,
      mockTemplatesService as unknown as TemplatesService,
    );
  });

  describe('loadFromContent', () => {
    it('should parse valid YAML content', async () => {
      const yamlContent = `
name: Test Template
version: 1
categories:
  - name: Category 1
    weight: 1.0
    sortOrder: 1
    criteria:
      - code: TC-01
        name: Test
        controlType: technical
`;

      const result = await service.loadFromContent(yamlContent);

      expect(result.name).toBe('Test Template');
      expect(result.version).toBe(1);
      expect(result.categories).toHaveLength(1);
    });

    it('should reject content exceeding size limit', async () => {
      const largeContent = 'a'.repeat(6 * 1024 * 1024);

      await expect(service.loadFromContent(largeContent)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid YAML syntax', async () => {
      const invalidYaml = 'name: [invalid yaml';

      await expect(service.loadFromContent(invalidYaml)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('syncFromContent', () => {
    it('should create and publish template from valid content', async () => {
      const yamlContent = `
name: Test Template
version: 1
categories:
  - name: Category 1
    weight: 1.0
    sortOrder: 1
    criteria:
      - code: TC-01
        name: Test
        controlType: technical
`;

      const result = await service.syncFromContent(yamlContent, 'user-123');

      expect(result.created).toBe(true);
      expect(mockTemplatesService.create).toHaveBeenCalled();
      expect(mockTemplatesService.publish).toHaveBeenCalled();
    });

    it('should skip sync if same version already exists', async () => {
      mockTemplatesService.findPublishedByName.mockResolvedValue(
        createMockTemplate({ version: 1 }),
      );

      const yamlContent = `
name: Test Template
version: 1
categories:
  - name: Category 1
    weight: 1.0
    sortOrder: 1
    criteria:
      - code: TC-01
        name: Test
        controlType: technical
`;

      const result = await service.syncFromContent(yamlContent, 'user-123');

      expect(result.created).toBe(false);
      expect(result.updated).toBe(false);
      expect(mockTemplatesService.create).not.toHaveBeenCalled();
    });

    it('should reject invalid template definition', async () => {
      mockValidator.validate.mockResolvedValue({
        valid: false,
        errors: [{ path: '/name', message: 'Required' }],
      });

      const yamlContent = `
version: 1
categories: []
`;

      await expect(
        service.syncFromContent(yamlContent, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('exportToYaml', () => {
    it('should export template to YAML format', async () => {
      const result = await service.exportToYaml('template-123');

      expect(result).toContain('name: Test Template');
      expect(result).toContain('version: 1');
      expect(result).toContain('TC-01');
    });

    it('should include all criteria fields', async () => {
      const result = await service.exportToYaml('template-123');

      expect(result).toContain('controlType');
      expect(result).toContain('controlGroup');
      expect(result).toContain('isMandatory');
    });
  });

  describe('sanitizeFilename', () => {
    it('should reject path traversal attempts', async () => {
      await expect(service.loadFromFile('../../../etc/passwd')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject null bytes in filename', async () => {
      await expect(service.loadFromFile('file\0.yaml')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid extensions', async () => {
      await expect(service.loadFromFile('file.json')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
