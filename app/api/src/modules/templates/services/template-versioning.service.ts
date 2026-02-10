import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AssessmentTemplate } from '../entities/assessment-template.entity';
import { AssessmentCategory } from '../entities/assessment-category.entity';
import { Criterion } from '../entities/criterion.entity';
import { InMemoryCacheService } from '../../../common/cache';
import { TemplatesService } from '../templates.service';

@Injectable()
export class TemplateVersioningService {
  private readonly logger = new Logger(TemplateVersioningService.name);

  constructor(
    @InjectRepository(AssessmentTemplate)
    private readonly templateRepository: Repository<AssessmentTemplate>,
    private readonly dataSource: DataSource,
    private readonly cache: InMemoryCacheService,
    @Inject(forwardRef(() => TemplatesService))
    private readonly templatesService: TemplatesService,
  ) {}

  async publish(id: string): Promise<AssessmentTemplate> {
    const template = await this.templatesService.findOne(id);

    if (template.isPublished) {
      throw new BadRequestException('Template is already published');
    }

    if (template.categories.length === 0) {
      throw new BadRequestException(
        'Cannot publish a template without categories',
      );
    }

    const hasCriteria = template.categories.some((c) => c.criteria.length > 0);
    if (!hasCriteria) {
      throw new BadRequestException(
        'Cannot publish a template without any criteria',
      );
    }

    const totalWeight = template.categories.reduce(
      (sum, c) => sum + c.weight,
      0,
    );
    if (Math.abs(totalWeight - 1) > 0.0001) {
      throw new BadRequestException(
        `Category weights must sum to 1. Current sum: ${totalWeight.toFixed(4)}`,
      );
    }

    for (const category of template.categories) {
      if (category.criteria.length > 0) {
        const criteriaWeight = category.criteria.reduce(
          (sum, cr) => sum + cr.weight,
          0,
        );
        if (Math.abs(criteriaWeight - 1) > 0.0001) {
          throw new BadRequestException(
            `Criteria weights in category "${category.name}" must sum to 1. Current sum: ${criteriaWeight.toFixed(4)}`,
          );
        }
      }
    }

    template.isPublished = true;
    await this.templateRepository.save(template);

    this.invalidateTemplateCache(id, template.name);

    return this.templatesService.findOne(id);
  }

  async createNewVersion(
    id: string,
    userId: string,
  ): Promise<AssessmentTemplate> {
    const sourceTemplate = await this.templatesService.findOne(id);

    if (!sourceTemplate.isPublished) {
      throw new BadRequestException(
        'Can only create a new version from a published template',
      );
    }

    const latestVersion = await this.templateRepository.findOne({
      where: { name: sourceTemplate.name },
      order: { version: 'DESC' },
    });

    const newVersion = (latestVersion?.version ?? 0) + 1;

    return this.dataSource.transaction(async (manager) => {
      const newTemplate = manager.create(AssessmentTemplate, {
        name: sourceTemplate.name,
        description: sourceTemplate.description,
        version: newVersion,
        isPublished: false,
        parentVersionId: sourceTemplate.id,
        effectiveFrom: null,
        effectiveTo: null,
        createdById: userId,
      });

      const savedTemplate = await manager.save(AssessmentTemplate, newTemplate);

      for (const category of sourceTemplate.categories) {
        const newCategory = manager.create(AssessmentCategory, {
          templateId: savedTemplate.id,
          name: category.name,
          description: category.description,
          weight: category.weight,
          sortOrder: category.sortOrder,
        });

        const savedCategory = await manager.save(
          AssessmentCategory,
          newCategory,
        );

        for (const criterion of category.criteria) {
          const newCriterion = manager.create(Criterion, {
            categoryId: savedCategory.id,
            code: criterion.code,
            name: criterion.name,
            description: criterion.description,
            guidance: criterion.guidance,
            weight: criterion.weight,
            isMandatory: criterion.isMandatory,
            isCriticalFail: criterion.isCriticalFail,
            minPassingScore: criterion.minPassingScore,
            maxScore: criterion.maxScore,
            evidenceRequired: criterion.evidenceRequired,
            evidenceDescription: criterion.evidenceDescription,
            sortOrder: criterion.sortOrder,
            controlGroup: criterion.controlGroup,
            controlType: criterion.controlType,
            cisMapping: criterion.cisMapping,
            verificationMethod: criterion.verificationMethod,
          });

          await manager.save(Criterion, newCriterion);
        }
      }

      const result = await manager.findOne(AssessmentTemplate, {
        where: { id: savedTemplate.id },
        relations: ['categories', 'categories.criteria'],
      });

      if (!result) {
        throw new Error('Failed to reload created template version');
      }

      return result;
    });
  }

  invalidateTemplateCache(id: string, name?: string): void {
    this.cache.delete(`template:${id}`);
    if (name) {
      this.cache.delete(`template:published:${name}`);
    }
    this.cache.deleteByPrefix('templates:list:');
    this.logger.debug(`Invalidated cache for template ${id}`);
  }
}
