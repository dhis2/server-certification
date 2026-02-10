import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// crypto.randomBytes(8).toString('base64url') produces exactly 11 base64url chars
const VERIFICATION_CODE_LENGTH = 11;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

// Format: DHIS2-YYYY-[PF]-HHHHHHHH (21 chars)
const CERTIFICATE_NUMBER_LENGTH = 21;
const CERTIFICATE_NUMBER_PATTERN = /^DHIS2-\d{4}-[PF]-[A-F0-9]{8}$/;

@ValidatorConstraint({ name: 'isVerificationCode', async: false })
export class VerificationCodeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    if (value.length !== VERIFICATION_CODE_LENGTH) {
      return false;
    }

    return BASE64URL_PATTERN.test(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Invalid verification code format';
  }
}

@ValidatorConstraint({ name: 'isCertificateNumber', async: false })
export class CertificateNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    if (value.length !== CERTIFICATE_NUMBER_LENGTH) {
      return false;
    }

    return CERTIFICATE_NUMBER_PATTERN.test(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Invalid certificate number format';
  }
}

export function IsVerificationCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: {
        message: 'Invalid verification code format',
        ...validationOptions,
      },
      constraints: [],
      validator: VerificationCodeConstraint,
    });
  };
}

export function IsCertificateNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: {
        message: 'Invalid certificate number format',
        ...validationOptions,
      },
      constraints: [],
      validator: CertificateNumberConstraint,
    });
  };
}

export function isValidVerificationCode(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  if (value.length !== VERIFICATION_CODE_LENGTH) {
    return false;
  }
  return BASE64URL_PATTERN.test(value);
}

export function isValidCertificateNumber(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  if (value.length !== CERTIFICATE_NUMBER_LENGTH) {
    return false;
  }
  return CERTIFICATE_NUMBER_PATTERN.test(value);
}
