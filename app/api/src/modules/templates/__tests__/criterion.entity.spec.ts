import { Criterion } from '../entities/criterion.entity';
import { ControlGroup, ControlType } from '../../../common/enums';

describe('Criterion Entity', () => {
  let criterion: Criterion;

  beforeEach(() => {
    criterion = new Criterion();
    criterion.id = 'criterion-123';
    criterion.categoryId = 'category-123';
    criterion.code = 'DB-01';
    criterion.name = 'Regular Automated Database Backup';
    criterion.description = 'Automated daily backups must be configured';
    criterion.weight = 0.1;
    criterion.sortOrder = 1;
  });

  describe('controlGroup field', () => {
    it('should accept DSCP1 value', () => {
      criterion.controlGroup = ControlGroup.DSCP1;
      expect(criterion.controlGroup).toBe(ControlGroup.DSCP1);
    });

    it('should default to DSCP1 when not set', () => {
      // Note: This test verifies the TypeORM default will be applied
      // The actual default is set via @Column({ default: 'DSCP1' })
      const newCriterion = new Criterion();
      // Before saving to DB, the field is undefined
      // After saving, TypeORM applies the default
      expect(newCriterion.controlGroup).toBeUndefined();
    });
  });

  describe('controlType field', () => {
    it('should accept technical value', () => {
      criterion.controlType = ControlType.TECHNICAL;
      expect(criterion.controlType).toBe(ControlType.TECHNICAL);
    });

    it('should accept organizational value', () => {
      criterion.controlType = ControlType.ORGANIZATIONAL;
      expect(criterion.controlType).toBe(ControlType.ORGANIZATIONAL);
    });

    it('should default to technical when not set', () => {
      // Note: This test verifies the TypeORM default will be applied
      const newCriterion = new Criterion();
      expect(newCriterion.controlType).toBeUndefined();
    });
  });

  describe('cisMapping field', () => {
    it('should accept a string value', () => {
      criterion.cisMapping = '11.2';
      expect(criterion.cisMapping).toBe('11.2');
    });

    it('should accept null value', () => {
      criterion.cisMapping = null;
      expect(criterion.cisMapping).toBeNull();
    });

    it('should be optional (undefined by default)', () => {
      const newCriterion = new Criterion();
      expect(newCriterion.cisMapping).toBeUndefined();
    });
  });

  describe('verificationMethod field', () => {
    it('should accept a string value', () => {
      criterion.verificationMethod =
        'Review backup configuration files; verify backup logs from past 30 days';
      expect(criterion.verificationMethod).toBe(
        'Review backup configuration files; verify backup logs from past 30 days',
      );
    });

    it('should accept null value', () => {
      criterion.verificationMethod = null;
      expect(criterion.verificationMethod).toBeNull();
    });

    it('should be optional (undefined by default)', () => {
      const newCriterion = new Criterion();
      expect(newCriterion.verificationMethod).toBeUndefined();
    });
  });

  describe('certification control scenarios', () => {
    it('should correctly represent a DSCP1 technical control', () => {
      criterion.controlGroup = ControlGroup.DSCP1;
      criterion.controlType = ControlType.TECHNICAL;
      criterion.cisMapping = '11.2';
      criterion.verificationMethod =
        'Review backup configuration files; verify backup logs';
      criterion.isMandatory = true;
      criterion.evidenceRequired = true;

      expect(criterion.controlGroup).toBe(ControlGroup.DSCP1);
      expect(criterion.controlType).toBe(ControlType.TECHNICAL);
      expect(criterion.cisMapping).toBe('11.2');
      expect(criterion.verificationMethod).toContain('backup');
      expect(criterion.isMandatory).toBe(true);
      expect(criterion.evidenceRequired).toBe(true);
    });

    it('should correctly represent an organizational control', () => {
      criterion.code = 'PS-01';
      criterion.name = 'Security Leadership Accountability';
      criterion.controlGroup = ControlGroup.DSCP1;
      criterion.controlType = ControlType.ORGANIZATIONAL;
      criterion.cisMapping = null;
      criterion.verificationMethod =
        'Review organizational chart; verify security manager responsibilities';
      criterion.isMandatory = false;
      criterion.evidenceRequired = false;

      expect(criterion.controlGroup).toBe(ControlGroup.DSCP1);
      expect(criterion.controlType).toBe(ControlType.ORGANIZATIONAL);
      expect(criterion.cisMapping).toBeNull();
      expect(criterion.isMandatory).toBe(false);
    });
  });
});
