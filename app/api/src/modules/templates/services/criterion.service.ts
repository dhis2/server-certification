import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentCategory } from '../entities/assessment-category.entity';
import { Criterion } from '../entities/criterion.entity';
import { CreateCriterionDto, UpdateCriterionDto } from '../dto';

@Injectable()
export class CriterionService {
  constructor(
    @InjectRepository(Criterion)
    private readonly criterionRepository: Repository<Criterion>,
    @InjectRepository(AssessmentCategory)
    private readonly categoryRepository: Repository<AssessmentCategory>,
  ) {}

  async addCriterion(
    categoryId: string,
    dto: CreateCriterionDto,
  ): Promise<Criterion> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['template'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    if (category.template.isPublished) {
      throw new BadRequestException(
        'Cannot add criteria to a published template',
      );
    }

    const existingCriterion = await this.criterionRepository.findOne({
      where: { categoryId, code: dto.code },
    });

    if (existingCriterion) {
      throw new ConflictException(
        `Criterion with code "${dto.code}" already exists in this category`,
      );
    }

    const criterion = this.criterionRepository.create({
      categoryId,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      guidance: dto.guidance ?? null,
      weight: dto.weight,
      isMandatory: dto.isMandatory ?? false,
      isCriticalFail: dto.isCriticalFail ?? false,
      minPassingScore: dto.minPassingScore ?? 0,
      maxScore: dto.maxScore ?? 100,
      evidenceRequired: dto.evidenceRequired ?? false,
      evidenceDescription: dto.evidenceDescription ?? null,
      sortOrder: dto.sortOrder,
      controlGroup: dto.controlGroup,
      controlType: dto.controlType,
      cisMapping: dto.cisMapping ?? null,
      verificationMethod: dto.verificationMethod ?? null,
    });

    return this.criterionRepository.save(criterion);
  }

  async updateCriterion(
    criterionId: string,
    dto: UpdateCriterionDto,
  ): Promise<Criterion> {
    const criterion = await this.criterionRepository.findOne({
      where: { id: criterionId },
      relations: ['category', 'category.template'],
    });

    if (!criterion) {
      throw new NotFoundException(
        `Criterion with ID "${criterionId}" not found`,
      );
    }

    if (criterion.category.template.isPublished) {
      throw new BadRequestException(
        'Cannot update criteria of a published template',
      );
    }

    if (dto.code && dto.code !== criterion.code) {
      const existingCriterion = await this.criterionRepository.findOne({
        where: { categoryId: criterion.categoryId, code: dto.code },
      });

      if (existingCriterion) {
        throw new ConflictException(
          `Criterion with code "${dto.code}" already exists in this category`,
        );
      }
    }

    if (dto.code !== undefined) criterion.code = dto.code;
    if (dto.name !== undefined) criterion.name = dto.name;
    if (dto.description !== undefined) {
      criterion.description = dto.description ?? null;
    }
    if (dto.guidance !== undefined) criterion.guidance = dto.guidance ?? null;
    if (dto.weight !== undefined) criterion.weight = dto.weight;
    if (dto.isMandatory !== undefined) criterion.isMandatory = dto.isMandatory;
    if (dto.isCriticalFail !== undefined) {
      criterion.isCriticalFail = dto.isCriticalFail;
    }
    if (dto.minPassingScore !== undefined) {
      criterion.minPassingScore = dto.minPassingScore;
    }
    if (dto.maxScore !== undefined) criterion.maxScore = dto.maxScore;
    if (dto.evidenceRequired !== undefined) {
      criterion.evidenceRequired = dto.evidenceRequired;
    }
    if (dto.evidenceDescription !== undefined) {
      criterion.evidenceDescription = dto.evidenceDescription ?? null;
    }
    if (dto.sortOrder !== undefined) criterion.sortOrder = dto.sortOrder;
    if (dto.controlGroup !== undefined) {
      criterion.controlGroup = dto.controlGroup;
    }
    if (dto.controlType !== undefined) {
      criterion.controlType = dto.controlType;
    }
    if (dto.cisMapping !== undefined) {
      criterion.cisMapping = dto.cisMapping ?? null;
    }
    if (dto.verificationMethod !== undefined) {
      criterion.verificationMethod = dto.verificationMethod ?? null;
    }

    return this.criterionRepository.save(criterion);
  }

  async deleteCriterion(criterionId: string): Promise<void> {
    const criterion = await this.criterionRepository.findOne({
      where: { id: criterionId },
      relations: ['category', 'category.template'],
    });

    if (!criterion) {
      throw new NotFoundException(
        `Criterion with ID "${criterionId}" not found`,
      );
    }

    if (criterion.category.template.isPublished) {
      throw new BadRequestException(
        'Cannot delete criteria from a published template',
      );
    }

    await this.criterionRepository.remove(criterion);
  }
}
