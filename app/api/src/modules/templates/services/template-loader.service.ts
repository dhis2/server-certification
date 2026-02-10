import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'fs/promises';
import { TemplateValidatorService } from './template-validator.service';
import { TemplateVersioningService } from './template-versioning.service';
import {
  TemplateDefinition,
  TemplateSyncResult,
} from '../interfaces/template-definition.interface';
import { TemplatesService } from '../templates.service';
import { ControlType, ControlGroup } from '../../../common/enums';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.yaml', '.yml'];

@Injectable()
export class TemplateLoaderService implements OnModuleInit {
  private readonly logger = new Logger(TemplateLoaderService.name);
  private readonly templatesPath: string;
  private readonly autoSync: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly validator: TemplateValidatorService,
    private readonly templatesService: TemplatesService,
    @Inject(forwardRef(() => TemplateVersioningService))
    private readonly versioningService: TemplateVersioningService,
  ) {
    this.templatesPath = this.configService.get<string>(
      'TEMPLATES_PATH',
      path.join(process.cwd(), 'templates'),
    );
    this.autoSync = this.configService.get<boolean>(
      'TEMPLATES_AUTO_SYNC',
      false,
    );
  }

  async onModuleInit(): Promise<void> {
    if (this.autoSync) {
      try {
        await this.syncAllFromFiles();
      } catch (error) {
        this.logger.error('Failed to auto-sync templates on startup', error);
      }
    }
  }

  async loadFromFile(filename: string): Promise<TemplateDefinition> {
    const sanitizedFilename = this.sanitizeFilename(filename);
    const filePath = path.join(this.templatesPath, sanitizedFilename);

    await this.validateFilePath(filePath);

    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is sanitized and validated
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${String(MAX_FILE_SIZE)} bytes)`,
      );
    }

    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is sanitized and validated
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseYaml(content, sanitizedFilename);
  }

  loadFromContent(content: string): TemplateDefinition {
    if (content.length > MAX_FILE_SIZE) {
      throw new BadRequestException('Content size exceeds maximum allowed');
    }
    return this.parseYaml(content, 'inline');
  }

  async syncFromFile(
    filename: string,
    userId: string,
  ): Promise<TemplateSyncResult> {
    const definition = await this.loadFromFile(filename);
    return this.syncTemplate(definition, userId);
  }

  async syncFromContent(
    content: string,
    userId: string,
  ): Promise<TemplateSyncResult> {
    const definition = this.loadFromContent(content);
    return this.syncTemplate(definition, userId);
  }

  async syncAllFromFiles(): Promise<TemplateSyncResult[]> {
    const results: TemplateSyncResult[] = [];
    const pattern = path.join(this.templatesPath, '*.{yaml,yml}');

    const files: string[] = [];
    try {
      const asyncIterator = glob(pattern);
      for await (const file of asyncIterator) {
        files.push(file);
      }
    } catch {
      this.logger.warn(`No template files found at ${this.templatesPath}`);
      return results;
    }

    for (const file of files) {
      try {
        const filename = path.basename(file);
        if (filename === 'schema.json') continue;

        const definition = await this.loadFromFile(filename);
        const result = await this.syncTemplate(definition, 'system');
        results.push(result);
        this.logger.log(
          `Synced template: ${definition.name} v${String(definition.version)}`,
        );
      } catch (error) {
        this.logger.error(`Failed to sync template from ${file}`, error);
      }
    }

    return results;
  }

  async exportToYaml(templateId: string): Promise<string> {
    const template = await this.templatesService.findOne(templateId);

    const definition: TemplateDefinition = {
      name: template.name,
      version: template.version,
      description: template.description ?? undefined,
      categories: template.categories.map((cat) => ({
        name: cat.name,
        description: cat.description ?? undefined,
        weight: Number(cat.weight),
        sortOrder: cat.sortOrder,
        criteria: cat.criteria.map((crit) => ({
          code: crit.code,
          name: crit.name,
          description: crit.description ?? undefined,
          verificationMethod: crit.verificationMethod ?? undefined,
          guidance: crit.guidance ?? undefined,
          controlType: crit.controlType,
          controlGroup: crit.controlGroup,
          isMandatory: crit.isMandatory,
          isCriticalFail: crit.isCriticalFail,
          evidenceRequired: crit.evidenceRequired,
          evidenceDescription: crit.evidenceDescription ?? undefined,
          cisMapping: crit.cisMapping,
          weight: Number(crit.weight),
          minPassingScore: crit.minPassingScore,
          maxScore: crit.maxScore,
        })),
      })),
    };

    return yaml.dump(definition, {
      lineWidth: 100,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
    });
  }

  private async syncTemplate(
    definition: TemplateDefinition,
    userId: string,
  ): Promise<TemplateSyncResult> {
    const validation = await this.validator.validate(definition);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Template validation failed',
        errors: validation.errors,
      });
    }

    const existing = await this.templatesService.findPublishedByName(
      definition.name,
    );

    if (existing && existing.version >= definition.version) {
      const criteriaCount = existing.categories.reduce(
        (sum, cat) => sum + cat.criteria.length,
        0,
      );
      return {
        created: false,
        updated: false,
        templateId: existing.id,
        name: existing.name,
        version: existing.version,
        categoriesCount: existing.categories.length,
        criteriaCount,
      };
    }

    const normalizedDefinition = this.normalizeDefinition(definition);

    const template = await this.templatesService.create(
      {
        name: normalizedDefinition.name,
        description: normalizedDefinition.description,
        effectiveFrom: normalizedDefinition.effectiveFrom,
        effectiveTo: normalizedDefinition.effectiveTo,
        categories: normalizedDefinition.categories.map((cat) => ({
          name: cat.name,
          description: cat.description,
          weight: cat.weight,
          sortOrder: cat.sortOrder,
          criteria: cat.criteria.map((crit, critIdx) => ({
            code: crit.code,
            name: crit.name,
            description: crit.description,
            guidance: crit.guidance ?? crit.verificationMethod,
            verificationMethod: crit.verificationMethod,
            weight: this.calculateCriterionWeight(cat.criteria.length),
            isMandatory: crit.isMandatory ?? false,
            isCriticalFail:
              crit.isCriticalFail ??
              (crit.controlType === ControlType.TECHNICAL &&
                (crit.isMandatory ?? false)),
            minPassingScore:
              crit.minPassingScore ??
              (crit.controlType === ControlType.TECHNICAL ? 100 : 0),
            maxScore: crit.maxScore ?? 100,
            evidenceRequired: crit.evidenceRequired ?? false,
            evidenceDescription: crit.evidenceDescription,
            sortOrder: critIdx + 1,
            controlGroup:
              (crit.controlGroup as ControlGroup) ?? ControlGroup.DSCP1,
            controlType: crit.controlType as ControlType,
            cisMapping: crit.cisMapping,
          })),
        })),
      },
      userId,
    );

    await this.versioningService.publish(template.id);

    const criteriaCount = normalizedDefinition.categories.reduce(
      (sum, cat) => sum + cat.criteria.length,
      0,
    );

    return {
      created: true,
      updated: false,
      templateId: template.id,
      name: template.name,
      version: template.version,
      categoriesCount: normalizedDefinition.categories.length,
      criteriaCount,
    };
  }

  private normalizeDefinition(
    definition: TemplateDefinition,
  ): TemplateDefinition {
    return {
      ...definition,
      categories: definition.categories.map((cat) => ({
        ...cat,
        criteria: cat.criteria.map((crit) => ({
          ...crit,
          controlType: this.normalizeControlType(crit.controlType),
          controlGroup:
            (crit.controlGroup as ControlGroup) ?? ControlGroup.DSCP1,
        })),
      })),
    };
  }

  private normalizeControlType(type: string | ControlType): ControlType {
    if (type === 'technical') {
      return ControlType.TECHNICAL;
    }
    return ControlType.ORGANIZATIONAL;
  }

  private calculateCriterionWeight(criteriaCount: number): number {
    if (criteriaCount === 0) return 1;
    return Math.round((1 / criteriaCount) * 10000) / 10000;
  }

  private parseYaml(content: string, source: string): TemplateDefinition {
    try {
      const definition = yaml.load(content) as TemplateDefinition;

      if (!definition || typeof definition !== 'object') {
        throw new Error('Invalid YAML structure');
      }

      return definition;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown parsing error';
      throw new BadRequestException(
        `Failed to parse template from ${source}: ${message}`,
      );
    }
  }

  private sanitizeFilename(filename: string): string {
    if (/%2e|%2f|%5c/i.test(filename)) {
      throw new BadRequestException(
        'Encoded characters not allowed in filename',
      );
    }

    const sanitized = path.basename(filename);

    if (sanitized.includes('..') || sanitized.includes('\0')) {
      throw new BadRequestException('Invalid filename');
    }

    const ext = path.extname(sanitized).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    return sanitized;
  }

  private async validateFilePath(filePath: string): Promise<void> {
    const resolvedPath = path.resolve(filePath);
    const resolvedTemplatesPath = path.resolve(this.templatesPath);

    if (!resolvedPath.startsWith(resolvedTemplatesPath)) {
      throw new BadRequestException('Path traversal attempt detected');
    }

    try {
      await fs.access(filePath);
    } catch {
      throw new BadRequestException(
        `Template file not found: ${path.basename(filePath)}`,
      );
    }
  }
}
