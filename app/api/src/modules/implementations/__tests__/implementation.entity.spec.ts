import { Implementation } from '../entities/implementation.entity';

describe('Organization Entity', () => {
  let implementation: Implementation;

  beforeEach(() => {
    implementation = new Implementation();
  });

  describe('basic properties', () => {
    it('should set name property', () => {
      implementation.name = 'Ministry of Health Kenya';
      expect(implementation.name).toBe('Ministry of Health Kenya');
    });

    it('should set country property', () => {
      implementation.country = 'Kenya';
      expect(implementation.country).toBe('Kenya');
    });

    it('should allow null country', () => {
      implementation.country = null;
      expect(implementation.country).toBeNull();
    });

    it('should set contactEmail property', () => {
      implementation.contactEmail = 'contact@ministry.go.ke';
      expect(implementation.contactEmail).toBe('contact@ministry.go.ke');
    });

    it('should allow null contactEmail', () => {
      implementation.contactEmail = null;
      expect(implementation.contactEmail).toBeNull();
    });

    it('should set contactPhone property', () => {
      implementation.contactPhone = '+254-20-123-4567';
      expect(implementation.contactPhone).toBe('+254-20-123-4567');
    });

    it('should set description property', () => {
      implementation.description = 'Health ministry DHIS2 implementation';
      expect(implementation.description).toBe(
        'Health ministry DHIS2 implementation',
      );
    });
  });

  describe('DHIS2 instance properties', () => {
    it('should set dhis2InstanceUrl property', () => {
      implementation.dhis2InstanceUrl = 'https://dhis2.health.go.ke';
      expect(implementation.dhis2InstanceUrl).toBe(
        'https://dhis2.health.go.ke',
      );
    });

    it('should allow null dhis2InstanceUrl', () => {
      implementation.dhis2InstanceUrl = null;
      expect(implementation.dhis2InstanceUrl).toBeNull();
    });

    it('should set dhis2Version property', () => {
      implementation.dhis2Version = '2.40.2';
      expect(implementation.dhis2Version).toBe('2.40.2');
    });

    it('should allow null dhis2Version', () => {
      implementation.dhis2Version = null;
      expect(implementation.dhis2Version).toBeNull();
    });
  });

  describe('status and tracking properties', () => {
    it('should default isActive to undefined before persistence', () => {
      // Before saving, the default is not applied
      expect(implementation.isActive).toBeUndefined();
    });

    it('should set isActive property', () => {
      implementation.isActive = true;
      expect(implementation.isActive).toBe(true);
    });

    it('should set isActive to false for deactivated implementations', () => {
      implementation.isActive = false;
      expect(implementation.isActive).toBe(false);
    });

    it('should set createdById property', () => {
      const userId = '01234567-89ab-cdef-0123-456789abcdef';
      implementation.createdById = userId;
      expect(implementation.createdById).toBe(userId);
    });

    it('should allow null createdById', () => {
      implementation.createdById = null;
      expect(implementation.createdById).toBeNull();
    });
  });

  describe('generateId', () => {
    it('should generate a UUID v7 when id is not set', () => {
      implementation.generateId();
      expect(implementation.id).toBeDefined();
      expect(typeof implementation.id).toBe('string');
      // UUID v7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
      expect(implementation.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should not overwrite existing id', () => {
      const existingId = '01234567-89ab-7def-0123-456789abcdef';
      implementation.id = existingId;
      implementation.generateId();
      expect(implementation.id).toBe(existingId);
    });
  });

  describe('implementation as metadata record (not user account)', () => {
    it('should represent a DHIS2 server instance metadata', () => {
      // Implementation represents metadata about a DHIS2 server being assessed
      // NOT a user account
      implementation.name = 'Kenya MOH';
      implementation.dhis2InstanceUrl = 'https://dhis2.health.go.ke';
      implementation.dhis2Version = '2.40.2';
      implementation.contactEmail = 'admin@health.go.ke';
      implementation.isActive = true;

      expect(implementation.name).toBe('Kenya MOH');
      expect(implementation.dhis2InstanceUrl).toBe(
        'https://dhis2.health.go.ke',
      );
      expect(implementation.dhis2Version).toBe('2.40.2');
      // contactEmail is for contact purposes, not authentication
      expect(implementation.contactEmail).toBe('admin@health.go.ke');
    });
  });
});
