import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AssessmentTemplate } from './entities/assessment-template.entity';
import { AssessmentCategory } from './entities/assessment-category.entity';
import { Criterion } from './entities/criterion.entity';
import { CreateTemplateDto, CreateCategoryDto, UpdateTemplateDto } from './dto';
import { InMemoryCacheService } from '../../common/cache';
import {
  Connection,
  PaginatedSearchOptions,
  createLikePattern,
  isEmptySearch,
  paginate,
} from 'src/shared/pagination';

export interface FindTemplatesOptions extends PaginatedSearchOptions {
  isPublished?: boolean | undefined;
}

export type TemplatesConnection = Connection<AssessmentTemplate>;

const TEMPLATE_CACHE_TTL = 10 * 60 * 1000;

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(AssessmentTemplate)
    private readonly templateRepository: Repository<AssessmentTemplate>,
    private readonly dataSource: DataSource,
    private readonly cache: InMemoryCacheService,
  ) {}

  async findAll(
    options: FindTemplatesOptions = {},
  ): Promise<TemplatesConnection> {
    const qb = this.templateRepository.createQueryBuilder('template');

    if (options.isPublished !== undefined) {
      qb.where('template.isPublished = :isPublished', {
        isPublished: options.isPublished,
      });
    }

    if (!isEmptySearch(options.search)) {
      const pattern = createLikePattern(options.search!);
      const method = options.isPublished !== undefined ? 'andWhere' : 'where';
      qb[method](
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: pattern },
      );
    }

    return paginate(qb, 'template', {
      first: options.first,
      after: options.after,
      sortDirection: 'DESC',
    });
  }

  async findOne(id: string): Promise<AssessmentTemplate> {
    const cacheKey = `template:${id}`;

    const cached = this.cache.get<AssessmentTemplate>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for template ${id}`);
      return cached;
    }

    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['categories', 'categories.criteria'],
      order: {
        categories: { sortOrder: 'ASC' },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    for (const category of template.categories) {
      category.criteria.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (template.isPublished) {
      this.cache.set(cacheKey, template, TEMPLATE_CACHE_TTL);
      this.logger.debug(`Cached template ${id}`);
    }

    return template;
  }

  async findPublishedByName(name: string): Promise<AssessmentTemplate | null> {
    const cacheKey = `template:published:${name}`;

    const cached = this.cache.get<AssessmentTemplate | null>(cacheKey);
    if (cached !== undefined) {
      this.logger.debug(`Cache hit for published template ${name}`);
      return cached;
    }

    const template = await this.templateRepository.findOne({
      where: { name, isPublished: true },
      order: { version: 'DESC' },
      relations: ['categories', 'categories.criteria'],
    });

    if (template) {
      for (const category of template.categories) {
        category.criteria.sort((a, b) => a.sortOrder - b.sortOrder);
      }
    }

    // Cache the result (even null to prevent repeated lookups)
    this.cache.set(cacheKey, template, TEMPLATE_CACHE_TTL);
    return template;
  }

  async create(
    dto: CreateTemplateDto,
    userId: string,
  ): Promise<AssessmentTemplate> {
    const existingTemplate = await this.templateRepository.findOne({
      where: { name: dto.name, version: 1 },
    });

    if (existingTemplate) {
      throw new ConflictException(
        `Template with name "${dto.name}" already exists`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const template = manager.create(AssessmentTemplate, {
        name: dto.name,
        description: dto.description ?? null,
        version: 1,
        isPublished: false,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdById: userId,
      });

      const savedTemplate = await manager.save(AssessmentTemplate, template);

      if (dto.categories) {
        await this.createCategoriesWithCriteria(
          manager,
          savedTemplate.id,
          dto.categories,
        );
      }

      const result = await manager.findOne(AssessmentTemplate, {
        where: { id: savedTemplate.id },
        relations: ['categories', 'categories.criteria'],
      });

      if (!result) {
        throw new Error('Failed to reload created template');
      }

      return result;
    });
  }

  private async createCategoriesWithCriteria(
    manager: typeof this.dataSource.manager,
    templateId: string,
    categories: CreateCategoryDto[],
  ): Promise<void> {
    for (const categoryDto of categories) {
      const category = manager.create(AssessmentCategory, {
        templateId,
        name: categoryDto.name,
        description: categoryDto.description ?? null,
        weight: categoryDto.weight,
        sortOrder: categoryDto.sortOrder,
      });

      const savedCategory = await manager.save(AssessmentCategory, category);

      if (categoryDto.criteria) {
        for (const criterionDto of categoryDto.criteria) {
          const criterion = manager.create(Criterion, {
            categoryId: savedCategory.id,
            code: criterionDto.code,
            name: criterionDto.name,
            description: criterionDto.description ?? null,
            guidance: criterionDto.guidance ?? null,
            weight: criterionDto.weight,
            isMandatory: criterionDto.isMandatory ?? false,
            isCriticalFail: criterionDto.isCriticalFail ?? false,
            minPassingScore: criterionDto.minPassingScore ?? 0,
            maxScore: criterionDto.maxScore ?? 100,
            evidenceRequired: criterionDto.evidenceRequired ?? false,
            evidenceDescription: criterionDto.evidenceDescription ?? null,
            sortOrder: criterionDto.sortOrder,
            controlGroup: criterionDto.controlGroup,
            controlType: criterionDto.controlType,
            cisMapping: criterionDto.cisMapping ?? null,
            verificationMethod: criterionDto.verificationMethod ?? null,
          });

          await manager.save(Criterion, criterion);
        }
      }
    }
  }

  async update(
    id: string,
    dto: UpdateTemplateDto,
  ): Promise<AssessmentTemplate> {
    const template = await this.findOne(id);

    if (template.isPublished) {
      throw new BadRequestException(
        'Cannot update a published template. Create a new version instead.',
      );
    }

    if (dto.name && dto.name !== template.name) {
      const existingTemplate = await this.templateRepository.findOne({
        where: { name: dto.name, version: template.version },
      });

      if (existingTemplate) {
        throw new ConflictException(
          `Template with name "${dto.name}" and version ${String(template.version)} already exists`,
        );
      }
    }

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) {
      template.description = dto.description ?? null;
    }
    if (dto.effectiveFrom !== undefined) {
      template.effectiveFrom = dto.effectiveFrom
        ? new Date(dto.effectiveFrom)
        : null;
    }
    if (dto.effectiveTo !== undefined) {
      template.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    }

    await this.templateRepository.save(template);

    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);

    if (template.isPublished) {
      throw new BadRequestException('Cannot delete a published template');
    }

    await this.templateRepository.remove(template);
  }
}
