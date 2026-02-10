import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { TemplateLoaderService } from './services/template-loader.service';
import { TemplateValidatorService } from './services/template-validator.service';
import { TemplateRegistryService } from './services/template-registry.service';
import { CategoryService } from './services/category.service';
import { CriterionService } from './services/criterion.service';
import { TemplateVersioningService } from './services/template-versioning.service';
import { AssessmentTemplate } from './entities/assessment-template.entity';
import { AssessmentCategory } from './entities/assessment-category.entity';
import { Criterion } from './entities/criterion.entity';
import { InMemoryCacheService } from '../../common/cache';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      AssessmentTemplate,
      AssessmentCategory,
      Criterion,
    ]),
  ],
  controllers: [TemplatesController],
  providers: [
    TemplatesService,
    TemplateLoaderService,
    TemplateValidatorService,
    TemplateRegistryService,
    CategoryService,
    CriterionService,
    TemplateVersioningService,
    InMemoryCacheService,
  ],
  exports: [
    TemplatesService,
    TemplateLoaderService,
    TemplateRegistryService,
    CategoryService,
    CriterionService,
    TemplateVersioningService,
  ],
})
export class TemplatesModule {}
