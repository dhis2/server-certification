import { Injectable, Logger } from '@nestjs/common';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TemplateDefinition,
  TemplateValidationResult,
  TemplateValidationError,
} from '../interfaces/template-definition.interface';

@Injectable()
export class TemplateValidatorService {
  private readonly logger = new Logger(TemplateValidatorService.name);
  private readonly ajv: Ajv;
  private validateFn: ValidateFunction | null = null;
  private schemaLoaded = false;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: true,
      strictRequired: false,
      useDefaults: true,
    });
    addFormats(this.ajv);
  }

  async loadSchema(): Promise<void> {
    if (this.schemaLoaded) return;

    const schemaPath = path.join(process.cwd(), 'templates', 'schema.json');

    try {
      const schemaContent = await fs.readFile(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent) as Record<string, unknown>;
      this.validateFn = this.ajv.compile(schema);
      this.schemaLoaded = true;
      this.logger.log('Template schema loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load template schema', error);
      throw new Error(`Failed to load template schema: ${String(error)}`);
    }
  }

  async validate(
    definition: TemplateDefinition,
  ): Promise<TemplateValidationResult> {
    await this.loadSchema();

    if (!this.validateFn) {
      throw new Error('Schema not loaded');
    }

    const valid = this.validateFn(definition);

    if (valid) {
      const businessErrors = this.validateBusinessRules(definition);
      if (businessErrors.length > 0) {
        return { valid: false, errors: businessErrors };
      }
      return { valid: true, errors: [] };
    }

    const errors = this.formatErrors(this.validateFn.errors ?? []);
    return { valid: false, errors };
  }

  private validateBusinessRules(
    definition: TemplateDefinition,
  ): TemplateValidationError[] {
    const errors: TemplateValidationError[] = [];

    const totalWeight = definition.categories.reduce(
      (sum, cat) => sum + cat.weight,
      0,
    );
    if (Math.abs(totalWeight - 1) > 0.0001) {
      errors.push({
        path: '/categories',
        message: `Category weights must sum to 1.0, got ${totalWeight.toFixed(4)}`,
      });
    }

    const uniqueCodes = new Set<string>();
    for (let i = 0; i < definition.categories.length; i++) {
      const category = definition.categories[i];

      for (let j = 0; j < category.criteria.length; j++) {
        const criterion = category.criteria[j];

        if (uniqueCodes.has(criterion.code)) {
          errors.push({
            path: `/categories/${String(i)}/criteria/${String(j)}/code`,
            message: `Duplicate criterion code: ${criterion.code}`,
          });
        }
        uniqueCodes.add(criterion.code);

        if (
          criterion.minPassingScore !== undefined &&
          criterion.maxScore !== undefined &&
          criterion.minPassingScore > criterion.maxScore
        ) {
          errors.push({
            path: `/categories/${String(i)}/criteria/${String(j)}`,
            message: `minPassingScore (${String(criterion.minPassingScore)}) cannot exceed maxScore (${String(criterion.maxScore)})`,
          });
        }
      }
    }

    return errors;
  }

  private formatErrors(ajvErrors: ErrorObject[]): TemplateValidationError[] {
    return ajvErrors.map((err) => ({
      path: err.instancePath || '/',
      message: err.message ?? 'Unknown validation error',
      keyword: err.keyword,
    }));
  }
}
