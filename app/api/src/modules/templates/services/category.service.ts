import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AssessmentCategory } from '../entities/assessment-category.entity';
import { AssessmentTemplate } from '../entities/assessment-template.entity';
import { Criterion } from '../entities/criterion.entity';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(AssessmentCategory)
    private readonly categoryRepository: Repository<AssessmentCategory>,
    @InjectRepository(AssessmentTemplate)
    private readonly templateRepository: Repository<AssessmentTemplate>,
    private readonly dataSource: DataSource,
  ) {}

  async addCategory(
    templateId: string,
    dto: CreateCategoryDto,
  ): Promise<AssessmentCategory> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID "${templateId}" not found`);
    }

    if (template.isPublished) {
      throw new BadRequestException(
        'Cannot add categories to a published template',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const category = manager.create(AssessmentCategory, {
        templateId,
        name: dto.name,
        description: dto.description ?? null,
        weight: dto.weight,
        sortOrder: dto.sortOrder,
      });

      const savedCategory = await manager.save(AssessmentCategory, category);

      if (dto.criteria) {
        for (const criterionDto of dto.criteria) {
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

      const result = await manager.findOne(AssessmentCategory, {
        where: { id: savedCategory.id },
        relations: ['criteria'],
      });

      if (!result) {
        throw new Error('Failed to reload created category');
      }

      return result;
    });
  }

  async updateCategory(
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<AssessmentCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['template'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    if (category.template.isPublished) {
      throw new BadRequestException(
        'Cannot update categories of a published template',
      );
    }

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.description !== undefined) {
      category.description = dto.description ?? null;
    }
    if (dto.weight !== undefined) category.weight = dto.weight;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;

    await this.categoryRepository.save(category);

    const result = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['criteria'],
    });

    if (!result) {
      throw new Error('Failed to reload updated category');
    }

    return result;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['template'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    if (category.template.isPublished) {
      throw new BadRequestException(
        'Cannot delete categories from a published template',
      );
    }

    await this.categoryRepository.remove(category);
  }
}
