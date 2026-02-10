import { TemplateValidatorService } from '../services/template-validator.service';
import { TemplateDefinition } from '../interfaces/template-definition.interface';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

const mockSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['name', 'version', 'categories'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    version: { type: 'integer', minimum: 1 },
    description: { type: 'string' },
    categories: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'weight', 'sortOrder', 'criteria'],
        properties: {
          name: { type: 'string' },
          weight: { type: 'number', minimum: 0, maximum: 1 },
          sortOrder: { type: 'integer' },
          criteria: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['code', 'name', 'controlType'],
              properties: {
                code: { type: 'string', pattern: '^[A-Z]{2,4}-[0-9]{1,3}$' },
                name: { type: 'string' },
                controlType: {
                  type: 'string',
                  enum: ['technical', 'organizational'],
                },
              },
            },
          },
        },
      },
    },
  },
};

const mockedFs = jest.mocked(fs);

describe('TemplateValidatorService', () => {
  let service: TemplateValidatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.readFile.mockResolvedValue(JSON.stringify(mockSchema));
    service = new TemplateValidatorService();
  });

  const createValidDefinition = (): TemplateDefinition => ({
    name: 'Test Template',
    version: 1,
    description: 'Test description',
    categories: [
      {
        name: 'Test Category',
        weight: 1.0,
        sortOrder: 1,
        criteria: [
          {
            code: 'TC-01',
            name: 'Test Criterion',
            controlType: 'technical',
          },
        ],
      },
    ],
  });

  describe('validate', () => {
    it('should validate a correct template definition', async () => {
      const definition = createValidDefinition();
      const result = await service.validate(definition);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject template missing required name', async () => {
      const definition = createValidDefinition();
      delete (definition as unknown as Record<string, unknown>).name;

      const result = await service.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message?.includes('name'))).toBe(true);
    });

    it('should reject template with empty categories', async () => {
      const definition = createValidDefinition();
      definition.categories = [];

      const result = await service.validate(definition);

      expect(result.valid).toBe(false);
    });

    it('should reject category weights not summing to 1', async () => {
      const definition = createValidDefinition();
      definition.categories[0].weight = 0.5;

      const result = await service.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message?.includes('weights'))).toBe(
        true,
      );
    });

    it('should reject duplicate criterion codes', async () => {
      const definition = createValidDefinition();
      definition.categories[0].criteria.push({
        code: 'TC-01',
        name: 'Duplicate Criterion',
        controlType: 'technical',
      });

      const result = await service.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message?.includes('Duplicate'))).toBe(
        true,
      );
    });

    it('should reject minPassingScore greater than maxScore', async () => {
      const definition = createValidDefinition();
      definition.categories[0].criteria[0].minPassingScore = 150;
      definition.categories[0].criteria[0].maxScore = 100;

      const result = await service.validate(definition);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message?.includes('minPassingScore')),
      ).toBe(true);
    });

    it('should accept multiple categories with weights summing to 1', async () => {
      const definition: TemplateDefinition = {
        name: 'Multi Category Template',
        version: 1,
        categories: [
          {
            name: 'Category 1',
            weight: 0.6,
            sortOrder: 1,
            criteria: [
              { code: 'CA-01', name: 'Crit 1', controlType: 'technical' },
            ],
          },
          {
            name: 'Category 2',
            weight: 0.4,
            sortOrder: 2,
            criteria: [
              { code: 'CB-01', name: 'Crit 2', controlType: 'organizational' },
            ],
          },
        ],
      };

      const result = await service.validate(definition);

      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('should validate criterion code pattern', async () => {
      const definition = createValidDefinition();
      definition.categories[0].criteria[0].code = 'invalid-code';

      const result = await service.validate(definition);

      expect(result.valid).toBe(false);
    });
  });

  describe('loadSchema', () => {
    it('should load schema from file', async () => {
      await service.loadSchema();

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('schema.json'),
        'utf-8',
      );
    });

    it('should cache schema after first load', async () => {
      await service.loadSchema();
      await service.loadSchema();

      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should throw on invalid schema file', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));
      const newService = new TemplateValidatorService();

      await expect(newService.loadSchema()).rejects.toThrow(
        'Failed to load template schema',
      );
    });
  });
});
