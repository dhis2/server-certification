import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateImplementationDto } from '../dto/create-implementation.dto';
import { UpdateImplementationDto } from '../dto/update-implementation.dto';

describe('Implementation DTOs', () => {
  describe('CreateImplementationDto', () => {
    describe('name field', () => {
      it('should pass validation with valid name', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Ministry of Health Kenya',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when name is missing', async () => {
        const dto = plainToInstance(CreateImplementationDto, {});
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'name')).toBe(true);
      });

      it('should fail validation when name exceeds 255 characters', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'a'.repeat(256),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'name')).toBe(true);
      });

      it('should fail validation with invalid characters in name', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Invalid<script>Name',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'name')).toBe(true);
      });

      it('should pass validation with alphanumeric name and allowed special chars', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Org-Name_123.Test',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    describe('country field', () => {
      it('should pass validation when country is provided', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          country: 'Kenya',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass validation when country is omitted (optional)', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when country exceeds 100 characters', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          country: 'a'.repeat(101),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'country')).toBe(true);
      });
    });

    describe('contactEmail field', () => {
      it('should pass validation with valid email', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          contactEmail: 'contact@ministry.gov.ke',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation with invalid email format', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          contactEmail: 'not-an-email',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'contactEmail')).toBe(true);
      });

      it('should pass validation when contactEmail is omitted (optional)', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    describe('contactPhone field', () => {
      it('should pass validation with valid phone', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          contactPhone: '+254-20-123-4567',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when contactPhone exceeds 50 characters', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          contactPhone: '1'.repeat(51),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'contactPhone')).toBe(true);
      });
    });

    describe('description field', () => {
      it('should pass validation with valid description', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          description: 'This is a description of the implementation.',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when description exceeds 2000 characters', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          description: 'a'.repeat(2001),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'description')).toBe(true);
      });
    });

    describe('dhis2InstanceUrl field', () => {
      it('should pass validation with valid URL', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          dhis2InstanceUrl: 'https://dhis2.health.go.ke',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation with invalid URL', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          dhis2InstanceUrl: 'not-a-url',
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'dhis2InstanceUrl')).toBe(
          true,
        );
      });

      it('should fail validation when URL exceeds 500 characters', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          dhis2InstanceUrl: 'https://example.com/' + 'a'.repeat(500),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'dhis2InstanceUrl')).toBe(
          true,
        );
      });
    });

    describe('dhis2Version field', () => {
      it('should pass validation with valid version', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          dhis2Version: '2.40.0',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail validation when version exceeds 50 characters', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Test Org',
          dhis2Version: 'v'.repeat(51),
        });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'dhis2Version')).toBe(true);
      });
    });

    describe('full valid DTO', () => {
      it('should pass validation with all fields provided', async () => {
        const dto = plainToInstance(CreateImplementationDto, {
          name: 'Ministry of Health Kenya',
          country: 'Kenya',
          contactEmail: 'admin@health.go.ke',
          contactPhone: '+254-20-271-7077',
          description: 'Kenya Ministry of Health DHIS2 implementation',
          dhis2InstanceUrl: 'https://dhis2.health.go.ke',
          dhis2Version: '2.40.2',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });
  });

  describe('UpdateImplementationDto', () => {
    it('should pass validation with partial update (only name)', async () => {
      const dto = plainToInstance(UpdateImplementationDto, {
        name: 'Updated Implementation Name',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with empty object (all fields optional)', async () => {
      const dto = plainToInstance(UpdateImplementationDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with only contactEmail update', async () => {
      const dto = plainToInstance(UpdateImplementationDto, {
        contactEmail: 'new-email@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with invalid email on update', async () => {
      const dto = plainToInstance(UpdateImplementationDto, {
        contactEmail: 'invalid-email',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'contactEmail')).toBe(true);
    });

    it('should fail validation with invalid URL on update', async () => {
      const dto = plainToInstance(UpdateImplementationDto, {
        dhis2InstanceUrl: 'not-a-valid-url',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'dhis2InstanceUrl')).toBe(true);
    });
  });
});
