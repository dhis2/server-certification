import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../templates.service';
import { AssessmentTemplate } from '../entities/assessment-template.entity';
import { InMemoryCacheService } from '../../../common/cache';
import {
  TemplateDiff,
  TemplateDiffItem,
} from '../interfaces/template-definition.interface';

const REGISTRY_CACHE_TTL = 5 * 60 * 1000;

@Injectable()
export class TemplateRegistryService {
  private readonly logger = new Logger(TemplateRegistryService.name);

  constructor(
    private readonly templatesService: TemplatesService,
    private readonly cache: InMemoryCacheService,
  ) {}

  async getActiveTemplate(name: string): Promise<AssessmentTemplate> {
    const cacheKey = `registry:active:${name}`;

    const cached = this.cache.get<AssessmentTemplate>(cacheKey);
    if (cached) {
      return cached;
    }

    const template = await this.templatesService.findPublishedByName(name);
    if (!template) {
      throw new NotFoundException(
        `No published template found with name: ${name}`,
      );
    }

    this.cache.set(cacheKey, template, REGISTRY_CACHE_TTL);
    return template;
  }

  async listPublishedTemplates(): Promise<AssessmentTemplate[]> {
    const { edges } = await this.templatesService.findAll({
      isPublished: true,
      first: 100,
    });
    return edges.map((e) => e.node);
  }

  async getTemplateVersions(name: string): Promise<AssessmentTemplate[]> {
    const { edges } = await this.templatesService.findAll({
      search: name,
      first: 100,
    });

    return edges
      .map((e) => e.node)
      .filter((t) => t.name === name)
      .sort((a, b) => b.version - a.version);
  }

  async diffVersions(
    name: string,
    fromVersion: number,
    toVersion: number,
  ): Promise<TemplateDiff> {
    const versions = await this.getTemplateVersions(name);

    const from = versions.find((v) => v.version === fromVersion);
    const to = versions.find((v) => v.version === toVersion);

    if (!from) {
      throw new NotFoundException(
        `Template "${name}" version ${String(fromVersion)} not found`,
      );
    }
    if (!to) {
      throw new NotFoundException(
        `Template "${name}" version ${String(toVersion)} not found`,
      );
    }

    const fromFull = await this.templatesService.findOne(from.id);
    const toFull = await this.templatesService.findOne(to.id);

    const changes = this.computeDiff(fromFull, toFull);

    return {
      fromVersion,
      toVersion,
      changes,
    };
  }

  async getStatistics(): Promise<{
    totalTemplates: number;
    publishedTemplates: number;
    draftTemplates: number;
    totalCategories: number;
    totalCriteria: number;
  }> {
    const { edges, totalCount } = await this.templatesService.findAll({
      first: 1000,
    });
    const all = edges.map((e) => e.node);

    const publishedTemplates = all.filter((t) => t.isPublished).length;
    const draftTemplates = totalCount - publishedTemplates;

    let totalCategories = 0;
    let totalCriteria = 0;

    for (const template of all.filter((t) => t.isPublished)) {
      const full = await this.templatesService.findOne(template.id);
      totalCategories += full.categories.length;
      totalCriteria += full.categories.reduce(
        (sum, cat) => sum + cat.criteria.length,
        0,
      );
    }

    return {
      totalTemplates: totalCount,
      publishedTemplates,
      draftTemplates,
      totalCategories,
      totalCriteria,
    };
  }

  invalidateCache(name?: string): void {
    if (name) {
      this.cache.delete(`registry:active:${name}`);
    }
    this.cache.deleteByPrefix('registry:');
  }

  private computeDiff(
    from: AssessmentTemplate,
    to: AssessmentTemplate,
  ): TemplateDiffItem[] {
    const changes: TemplateDiffItem[] = [];

    if (from.description !== to.description) {
      changes.push({
        type: 'modified',
        path: '/description',
        oldValue: from.description,
        newValue: to.description,
      });
    }

    const fromCategoryNames = new Set(from.categories.map((c) => c.name));
    const toCategoryNames = new Set(to.categories.map((c) => c.name));

    for (const cat of to.categories) {
      if (!fromCategoryNames.has(cat.name)) {
        changes.push({
          type: 'added',
          path: `/categories/${cat.name}`,
          newValue: { criteriaCount: cat.criteria.length },
        });
      }
    }

    for (const cat of from.categories) {
      if (!toCategoryNames.has(cat.name)) {
        changes.push({
          type: 'removed',
          path: `/categories/${cat.name}`,
          oldValue: { criteriaCount: cat.criteria.length },
        });
      }
    }

    const fromCriteria = new Map<string, { category: string; name: string }>();
    const toCriteria = new Map<string, { category: string; name: string }>();

    for (const cat of from.categories) {
      for (const crit of cat.criteria) {
        fromCriteria.set(crit.code, { category: cat.name, name: crit.name });
      }
    }

    for (const cat of to.categories) {
      for (const crit of cat.criteria) {
        toCriteria.set(crit.code, { category: cat.name, name: crit.name });
      }
    }

    for (const [code, info] of toCriteria) {
      if (!fromCriteria.has(code)) {
        changes.push({
          type: 'added',
          path: `/criteria/${code}`,
          newValue: info,
        });
      } else {
        const fromInfo = fromCriteria.get(code)!;
        if (
          fromInfo.name !== info.name ||
          fromInfo.category !== info.category
        ) {
          changes.push({
            type: 'modified',
            path: `/criteria/${code}`,
            oldValue: fromInfo,
            newValue: info,
          });
        }
      }
    }

    for (const [code, info] of fromCriteria) {
      if (!toCriteria.has(code)) {
        changes.push({
          type: 'removed',
          path: `/criteria/${code}`,
          oldValue: info,
        });
      }
    }

    return changes;
  }
}
