import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import {
  isValidVerificationCode,
  isValidCertificateNumber,
} from '../../shared/validators';

@Injectable()
export class ParseVerificationCodePipe implements PipeTransform<
  string,
  string
> {
  transform(value: string, _metadata: ArgumentMetadata): string {
    if (!isValidVerificationCode(value)) {
      throw new BadRequestException('Invalid verification code format');
    }
    return value;
  }
}

@Injectable()
export class ParseCertificateNumberPipe implements PipeTransform<
  string,
  string
> {
  transform(value: string, _metadata: ArgumentMetadata): string {
    const normalized = value.toUpperCase();
    if (!isValidCertificateNumber(normalized)) {
      throw new BadRequestException('Invalid certificate number format');
    }
    return normalized;
  }
}
