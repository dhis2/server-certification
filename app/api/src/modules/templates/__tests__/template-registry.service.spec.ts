import { NotFoundException } from '@nestjs/common';
import { TemplateRegistryService } from '../services/template-registry.service';
import { TemplatesService } from '../templates.service';
import type { InMemoryCacheService } from '../../../common/cache';
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
          controlGroup: ControlGroup.DSCP1,
          controlType: ControlType.TECHNICAL,
        },
      ],
    },
  ],
  ...overrides,
});

describe('TemplateRegistryService', () => {
  let service: TemplateRegistryService;
  let mockTemplatesService: {
    findOne: jest.Mock;
    findPublishedByName: jest.Mock;
    findAll: jest.Mock;
  };
  let mockCache: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
    deleteByPrefix: jest.Mock;
  };

  beforeEach(() => {
    mockTemplatesService = {
      findOne: jest.fn(),
      findPublishedByName: jest.fn(),
      findAll: jest.fn(),
    };

    mockCache = {
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
      delete: jest.fn(),
      deleteByPrefix: jest.fn(),
    };

    service = new TemplateRegistryService(
      mockTemplatesService as unknown as TemplatesService,
      mockCache as unknown as InMemoryCacheService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveTemplate', () => {
    it('should return cached template if available', async () => {
      const template = createMockTemplate();
      mockCache.get.mockReturnValue(template);

      const result = await service.getActiveTemplate('Test Template');

      expect(result).toEqual(template);
      expect(mockTemplatesService.findPublishedByName).not.toHaveBeenCalled();
    });

    it('should fetch and cache template if not cached', async () => {
      const template = createMockTemplate();
      mockTemplatesService.findPublishedByName.mockResolvedValue(template);

      const result = await service.getActiveTemplate('Test Template');

      expect(result).toEqual(template);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if no published template', async () => {
      mockTemplatesService.findPublishedByName.mockResolvedValue(null);

      await expect(service.getActiveTemplate('Unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listPublishedTemplates', () => {
    it('should return all published templates', async () => {
      const templates = [
        createMockTemplate(),
        createMockTemplate({ id: 'template-456' }),
      ];
      mockTemplatesService.findAll.mockResolvedValue({
        edges: templates.map((t) => ({ node: t, cursor: t.id })),
        totalCount: 2,
        pageInfo: { hasNextPage: false, endCursor: null },
      });

      const result = await service.listPublishedTemplates();

      expect(result).toHaveLength(2);
      expect(mockTemplatesService.findAll).toHaveBeenCalledWith({
        isPublished: true,
        first: 100,
      });
    });
  });

  describe('getTemplateVersions', () => {
    it('should return all versions sorted by version desc', async () => {
      const templates = [
        createMockTemplate({ version: 1 }),
        createMockTemplate({ version: 2, id: 'template-456' }),
      ];
      mockTemplatesService.findAll.mockResolvedValue({
        edges: templates.map((t) => ({ node: t, cursor: t.id })),
        totalCount: 2,
        pageInfo: { hasNextPage: false, endCursor: null },
      });

      const result = await service.getTemplateVersions('Test Template');

      expect(result[0].version).toBe(2);
      expect(result[1].version).toBe(1);
    });

    it('should filter by exact name match', async () => {
      const templates = [
        createMockTemplate({ name: 'Test Template' }),
        createMockTemplate({ name: 'Other Template', id: 'other-123' }),
      ];
      mockTemplatesService.findAll.mockResolvedValue({
        edges: templates.map((t) => ({ node: t, cursor: t.id })),
        totalCount: 2,
        pageInfo: { hasNextPage: false, endCursor: null },
      });

      const result = await service.getTemplateVersions('Test Template');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Template');
    });
  });

  describe('diffVersions', () => {
    it('should detect added criteria', async () => {
      const v1 = createMockTemplate({ version: 1 });
      const v2 = createMockTemplate({
        version: 2,
        id: 'template-v2',
        categories: [
          {
            ...v1.categories[0],
            criteria: [
              ...v1.categories[0].criteria,
              {
                code: 'TC-02',
                name: 'New Criterion',
                controlType: ControlType.TECHNICAL,
              },
            ],
          },
        ],
      });

      mockTemplatesService.findAll.mockResolvedValue({
        edges: [v1, v2].map((t) => ({ node: t, cursor: t.id })),
        totalCount: 2,
        pageInfo: { hasNextPage: false, endCursor: null },
      });
      mockTemplatesService.findOne
        .mockResolvedValueOnce(v1)
        .mockResolvedValueOnce(v2);

      const diff = await service.diffVersions('Test Template', 1, 2);

      expect(
        diff.changes.some(
          (c) => c.type === 'added' && c.path.includes('TC-02'),
        ),
      ).toBe(true);
    });

    it('should detect removed criteria', async () => {
      const v1 = createMockTemplate({
        version: 1,
        categories: [
          {
            id: 'cat-1',
            name: 'Category 1',
            criteria: [
              {
                code: 'TC-01',
                name: 'Keep',
                controlType: ControlType.TECHNICAL,
              },
              {
                code: 'TC-02',
                name: 'Remove',
                controlType: ControlType.TECHNICAL,
              },
            ],
          },
        ],
      });
      const v2 = createMockTemplate({
        version: 2,
        id: 'template-v2',
        categories: [
          {
            id: 'cat-1',
            name: 'Category 1',
            criteria: [
              {
                code: 'TC-01',
                name: 'Keep',
                controlType: ControlType.TECHNICAL,
              },
            ],
          },
        ],
      });

      mockTemplatesService.findAll.mockResolvedValue({
        edges: [v1, v2].map((t) => ({ node: t, cursor: t.id })),
        totalCount: 2,
        pageInfo: { hasNextPage: false, endCursor: null },
      });
      mockTemplatesService.findOne
        .mockResolvedValueOnce(v1)
        .mockResolvedValueOnce(v2);

      const diff = await service.diffVersions('Test Template', 1, 2);

      expect(
        diff.changes.some(
          (c) => c.type === 'removed' && c.path.includes('TC-02'),
        ),
      ).toBe(true);
    });

    it('should detect added categories', async () => {
      const v1 = createMockTemplate({ version: 1 });
      const v2 = createMockTemplate({
        version: 2,
        id: 'template-v2',
        categories: [
          ...v1.categories,
          {
            id: 'cat-2',
            name: 'New Category',
            criteria: [
              {
                code: 'NC-01',
                name: 'New',
                controlType: ControlType.TECHNICAL,
              },
            ],
          },
        ],
      });

      mockTemplatesService.findAll.mockResolvedValue({
        edges: [v1, v2].map((t) => ({ node: t, cursor: t.id })),
        totalCount: 2,
        pageInfo: { hasNextPage: false, endCursor: null },
      });
      mockTemplatesService.findOne
        .mockResolvedValueOnce(v1)
        .mockResolvedValueOnce(v2);

      const diff = await service.diffVersions('Test Template', 1, 2);

      expect(
        diff.changes.some(
          (c) => c.type === 'added' && c.path.includes('New Category'),
        ),
      ).toBe(true);
    });

    it('should throw if version not found', async () => {
      const template = createMockTemplate({ version: 1 });
      mockTemplatesService.findAll.mockResolvedValue({
        edges: [{ node: template, cursor: template.id }],
        totalCount: 1,
        pageInfo: { hasNextPage: false, endCursor: null },
      });

      await expect(
        service.diffVersions('Test Template', 1, 99),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return template statistics', async () => {
      const published = createMockTemplate({ isPublished: true });
      const draft = createMockTemplate({ id: 'draft-123', isPublished: false });

      mockTemplatesService.findAll.mockResolvedValue({
        edges: [published, draft].map((t) => ({ node: t, cursor: t.id })),
        totalCount: 2,
        pageInfo: { hasNextPage: false, endCursor: null },
      });
      mockTemplatesService.findOne.mockResolvedValue(published);

      const stats = await service.getStatistics();

      expect(stats.totalTemplates).toBe(2);
      expect(stats.publishedTemplates).toBe(1);
      expect(stats.draftTemplates).toBe(1);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate specific template cache', () => {
      service.invalidateCache('Test Template');

      expect(mockCache.delete).toHaveBeenCalledWith(
        'registry:active:Test Template',
      );
    });

    it('should invalidate all registry cache with prefix', () => {
      service.invalidateCache();

      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('registry:');
    });
  });
});
