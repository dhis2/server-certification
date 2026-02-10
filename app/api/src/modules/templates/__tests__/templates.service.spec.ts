jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { Test, type TestingModule } from '@nestjs/testing';
import type { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TemplatesService } from '../templates.service';
import { AssessmentTemplate } from '../entities/assessment-template.entity';
import { AssessmentCategory } from '../entities/assessment-category.entity';
import { Criterion } from '../entities/criterion.entity';
import { User } from '../../users/entities/user.entity';
import type { InMemoryCacheService } from '../../../common/cache';
import { ControlGroup, ControlType } from '../../../common/enums';

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
};

const createMockUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  user.id = 'user-123';
  user.email = 'admin@example.com';
  user.firstName = 'Admin';
  user.lastName = 'User';
  user.password = 'hashed';
  user.isActive = true;
  user.createdAt = new Date();
  user.updatedAt = new Date();
  Object.assign(user, overrides);
  return user;
};

const createMockTemplate = (
  overrides: Partial<AssessmentTemplate> = {},
): AssessmentTemplate => {
  const template = new AssessmentTemplate();
  template.id = 'template-123';
  template.name = 'DHIS2 Server Certification';
  template.description = 'Test template';
  template.version = 1;
  template.isPublished = false;
  template.parentVersionId = null;
  template.effectiveFrom = null;
  template.effectiveTo = null;
  template.createdById = 'user-123';
  template.createdAt = new Date();
  template.updatedAt = new Date();
  template.categories = [];
  Object.assign(template, overrides);
  return template;
};

const createMockCategory = (
  overrides: Partial<AssessmentCategory> = {},
): AssessmentCategory => {
  const category = new AssessmentCategory();
  category.id = 'category-123';
  category.templateId = 'template-123';
  category.name = 'Infrastructure';
  category.description = 'Infrastructure category';
  category.weight = 0.2;
  category.sortOrder = 1;
  category.createdAt = new Date();
  category.criteria = [];
  Object.assign(category, overrides);
  return category;
};

const createMockCriterion = (overrides: Partial<Criterion> = {}): Criterion => {
  const criterion = new Criterion();
  criterion.id = 'criterion-123';
  criterion.categoryId = 'category-123';
  criterion.code = 'INF-001';
  criterion.name = 'Server Requirements';
  criterion.description = 'Test criterion';
  criterion.guidance = 'Test guidance';
  criterion.weight = 0.25;
  criterion.isMandatory = false;
  criterion.isCriticalFail = false;
  criterion.minPassingScore = 0;
  criterion.maxScore = 100;
  criterion.evidenceRequired = false;
  criterion.evidenceDescription = null;
  criterion.sortOrder = 1;
  criterion.controlGroup = ControlGroup.DSCP1;
  criterion.controlType = ControlType.TECHNICAL;
  criterion.cisMapping = null;
  criterion.verificationMethod = null;
  criterion.createdAt = new Date();
  Object.assign(criterion, overrides);
  return criterion;
};

describe('TemplatesService', () => {
  let service: TemplatesService;
  let mockTemplateRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockCategoryRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let mockCriterionRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let mockDataSource: {
    transaction: jest.Mock;
    manager: Record<string, jest.Mock>;
  };
  let mockCacheService: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
    deleteByPrefix: jest.Mock;
  };

  beforeEach(async () => {
    mockTemplateRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockCategoryRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockCriterionRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn(),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      },
    };

    mockCacheService = {
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
      delete: jest.fn(),
      deleteByPrefix: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TemplatesService,
          useFactory: () => {
            return new TemplatesService(
              mockTemplateRepository as unknown as Repository<AssessmentTemplate>,
              mockCategoryRepository as unknown as Repository<AssessmentCategory>,
              mockCriterionRepository as unknown as Repository<Criterion>,
              mockDataSource as unknown as DataSource,
              mockCacheService as unknown as InMemoryCacheService,
            );
          },
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated templates', async () => {
      const templates = [createMockTemplate()];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([templates, 1]);

      const result = await service.findAll({ first: 10 });

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node).toEqual(templates[0]);
      expect(result.totalCount).toBe(1);
    });

    it('should filter by isPublished', async () => {
      const templates = [createMockTemplate({ isPublished: true })];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([templates, 1]);

      await service.findAll({ isPublished: true });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'template.isPublished = :isPublished',
        { isPublished: true },
      );
    });

    it('should filter by search', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'DHIS2' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: '%DHIS2%' },
      );
    });
  });

  describe('findOne', () => {
    it('should return template with categories and criteria', async () => {
      const template = createMockTemplate();
      mockTemplateRepository.findOne.mockResolvedValue(template);

      const result = await service.findOne('template-123');

      expect(result).toEqual(template);
      expect(mockTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        relations: ['categories', 'categories.criteria'],
        order: { categories: { sortOrder: 'ASC' } },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new template', async () => {
      const user = createMockUser();
      const template = createMockTemplate();

      mockTemplateRepository.findOne.mockResolvedValue(null);
      mockDataSource.transaction.mockImplementation(
        (callback: (manager: unknown) => Promise<AssessmentTemplate>) => {
          const mockManager = {
            create: jest.fn().mockReturnValue(template),
            save: jest.fn().mockResolvedValue(template),
            findOne: jest.fn().mockResolvedValue(template),
          };
          return callback(mockManager);
        },
      );

      const result = await service.create(
        { name: 'DHIS2 Server Certification' },
        user.id,
      );

      expect(result).toEqual(template);
    });

    it('should throw ConflictException for duplicate name', async () => {
      const user = createMockUser();
      const existingTemplate = createMockTemplate();
      mockTemplateRepository.findOne.mockResolvedValue(existingTemplate);

      await expect(
        service.create({ name: 'DHIS2 Server Certification' }, user.id),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a draft template', async () => {
      const template = createMockTemplate({ isPublished: false });
      // First call returns template for initial find, second call returns null for conflict check
      // Third call returns template again for the final findOne after save
      mockTemplateRepository.findOne
        .mockResolvedValueOnce(template) // findOne(id)
        .mockResolvedValueOnce(null) // name conflict check
        .mockResolvedValueOnce(template); // findOne(id) after save
      mockTemplateRepository.save.mockResolvedValue(template);

      const result = await service.update('template-123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw BadRequestException for published template', async () => {
      const template = createMockTemplate({ isPublished: true });
      mockTemplateRepository.findOne.mockResolvedValue(template);

      await expect(
        service.update('template-123', { name: 'Updated Name' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a draft template', async () => {
      const template = createMockTemplate({ isPublished: false });
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.remove.mockResolvedValue(template);

      await service.delete('template-123');

      expect(mockTemplateRepository.remove).toHaveBeenCalledWith(template);
    });

    it('should throw BadRequestException for published template', async () => {
      const template = createMockTemplate({ isPublished: true });
      mockTemplateRepository.findOne.mockResolvedValue(template);

      await expect(service.delete('template-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('publish', () => {
    it('should publish a valid template', async () => {
      const category = createMockCategory({ weight: 1.0 });
      const criterion = createMockCriterion({ weight: 1.0 });
      category.criteria = [criterion];
      const template = createMockTemplate({
        isPublished: false,
        categories: [category],
      });

      mockTemplateRepository.findOne.mockResolvedValue(template);
      const publishedTemplate = createMockTemplate({
        isPublished: true,
        categories: [category],
      });
      mockTemplateRepository.save.mockResolvedValue(publishedTemplate);

      const result = await service.publish('template-123');

      expect(result.isPublished).toBe(true);
    });

    it('should throw BadRequestException for already published template', async () => {
      const template = createMockTemplate({ isPublished: true });
      mockTemplateRepository.findOne.mockResolvedValue(template);

      await expect(service.publish('template-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for template without categories', async () => {
      const template = createMockTemplate({
        isPublished: false,
        categories: [],
      });
      mockTemplateRepository.findOne.mockResolvedValue(template);

      await expect(service.publish('template-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when category weights do not sum to 1', async () => {
      const category = createMockCategory({ weight: 0.5 });
      category.criteria = [createMockCriterion({ weight: 1.0 })];
      const template = createMockTemplate({
        isPublished: false,
        categories: [category],
      });
      mockTemplateRepository.findOne.mockResolvedValue(template);

      await expect(service.publish('template-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createNewVersion', () => {
    it('should create new version from published template', async () => {
      const user = createMockUser();
      const sourceTemplate = createMockTemplate({
        isPublished: true,
        categories: [createMockCategory()],
      });
      const newTemplate = createMockTemplate({
        id: 'template-456',
        version: 2,
        parentVersionId: 'template-123',
      });

      mockTemplateRepository.findOne.mockResolvedValueOnce(sourceTemplate);
      mockTemplateRepository.findOne.mockResolvedValueOnce(sourceTemplate);
      mockDataSource.transaction.mockImplementation(
        (callback: (manager: unknown) => Promise<AssessmentTemplate>) => {
          const mockManager = {
            create: jest.fn().mockReturnValue(newTemplate),
            save: jest.fn().mockResolvedValue(newTemplate),
            findOne: jest.fn().mockResolvedValue(newTemplate),
          };
          return callback(mockManager);
        },
      );

      const result = await service.createNewVersion('template-123', user.id);

      expect(result.parentVersionId).toBe('template-123');
    });

    it('should throw BadRequestException for unpublished template', async () => {
      const user = createMockUser();
      const template = createMockTemplate({ isPublished: false });
      mockTemplateRepository.findOne.mockResolvedValue(template);

      await expect(
        service.createNewVersion('template-123', user.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addCategory', () => {
    it('should add category to draft template', async () => {
      const template = createMockTemplate({ isPublished: false });
      const category = createMockCategory();

      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockDataSource.transaction.mockImplementation(
        (callback: (manager: unknown) => Promise<AssessmentCategory>) => {
          const mockManager = {
            create: jest.fn().mockReturnValue(category),
            save: jest.fn().mockResolvedValue(category),
            findOne: jest.fn().mockResolvedValue(category),
          };
          return callback(mockManager);
        },
      );

      const result = await service.addCategory('template-123', {
        name: 'Infrastructure',
        weight: 0.2,
        sortOrder: 1,
      });

      expect(result).toEqual(category);
    });

    it('should throw BadRequestException for published template', async () => {
      const template = createMockTemplate({ isPublished: true });
      mockTemplateRepository.findOne.mockResolvedValue(template);

      await expect(
        service.addCategory('template-123', {
          name: 'Infrastructure',
          weight: 0.2,
          sortOrder: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCategory', () => {
    it('should update category in draft template', async () => {
      const template = createMockTemplate({ isPublished: false });
      const category = createMockCategory();
      category.template = template;

      mockCategoryRepository.findOne.mockResolvedValue(category);
      const updatedCategory = createMockCategory({ name: 'Updated' });
      mockCategoryRepository.save.mockResolvedValue(updatedCategory);

      const result = await service.updateCategory('category-123', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException for nonexistent category', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCategory('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addCriterion', () => {
    it('should add criterion to category in draft template', async () => {
      const template = createMockTemplate({ isPublished: false });
      const category = createMockCategory();
      category.template = template;
      const criterion = createMockCriterion();

      mockCategoryRepository.findOne.mockResolvedValue(category);
      mockCriterionRepository.findOne.mockResolvedValue(null);
      mockCriterionRepository.create.mockReturnValue(criterion);
      mockCriterionRepository.save.mockResolvedValue(criterion);

      const result = await service.addCriterion('category-123', {
        code: 'INF-001',
        name: 'Server Requirements',
        weight: 0.25,
        sortOrder: 1,
      });

      expect(result).toEqual(criterion);
    });

    it('should throw ConflictException for duplicate code', async () => {
      const template = createMockTemplate({ isPublished: false });
      const category = createMockCategory();
      category.template = template;
      const existingCriterion = createMockCriterion();

      mockCategoryRepository.findOne.mockResolvedValue(category);
      mockCriterionRepository.findOne.mockResolvedValue(existingCriterion);

      await expect(
        service.addCriterion('category-123', {
          code: 'INF-001',
          name: 'Server Requirements',
          weight: 0.25,
          sortOrder: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCriterion', () => {
    it('should update criterion in draft template', async () => {
      const template = createMockTemplate({ isPublished: false });
      const category = createMockCategory();
      category.template = template;
      const criterion = createMockCriterion();
      criterion.category = category;

      mockCriterionRepository.findOne.mockResolvedValue(criterion);
      const updatedCriterion = createMockCriterion({ name: 'Updated' });
      mockCriterionRepository.save.mockResolvedValue(updatedCriterion);

      const result = await service.updateCriterion('criterion-123', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteCriterion', () => {
    it('should delete criterion from draft template', async () => {
      const template = createMockTemplate({ isPublished: false });
      const category = createMockCategory();
      category.template = template;
      const criterion = createMockCriterion();
      criterion.category = category;

      mockCriterionRepository.findOne.mockResolvedValue(criterion);
      mockCriterionRepository.remove.mockResolvedValue(criterion);

      await service.deleteCriterion('criterion-123');

      expect(mockCriterionRepository.remove).toHaveBeenCalledWith(criterion);
    });

    it('should throw BadRequestException for published template', async () => {
      const template = createMockTemplate({ isPublished: true });
      const category = createMockCategory();
      category.template = template;
      const criterion = createMockCriterion();
      criterion.category = category;

      mockCriterionRepository.findOne.mockResolvedValue(criterion);

      await expect(service.deleteCriterion('criterion-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
