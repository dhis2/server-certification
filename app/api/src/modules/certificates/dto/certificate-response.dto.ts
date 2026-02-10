import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Certificate } from '../entities/certificate.entity';

/**
 * Integrity verification status for a certificate.
 *
 * Per NIST SP 800-53 SI-7 (Software, Firmware, and Information Integrity):
 * Integrity verification should be performed and reported to detect tampering.
 */
export class IntegrityStatusDto {
  @ApiProperty({
    description: 'Whether integrity verification was performed',
  })
  verified!: boolean;

  @ApiPropertyOptional({
    description: 'Whether the hash integrity check passed',
  })
  integrityValid?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the cryptographic signature is valid',
  })
  signatureValid?: boolean;

  @ApiPropertyOptional({
    description: 'Error message if verification failed',
  })
  error?: string;
}

export class CertificateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  submissionId!: string;

  @ApiProperty()
  implementationId!: string;

  @ApiPropertyOptional()
  implementationName?: string | undefined;

  @ApiProperty()
  certificateNumber!: string;

  @ApiProperty({ enum: ['pass', 'fail'] })
  certificationResult!: string;

  @ApiProperty()
  finalScore!: number;

  @ApiProperty()
  validFrom!: string;

  @ApiProperty()
  validUntil!: string;

  @ApiProperty()
  verificationCode!: string | null;

  @ApiProperty()
  isRevoked!: boolean;

  @ApiPropertyOptional()
  revokedAt?: string | null;

  @ApiPropertyOptional()
  revocationReason?: string | null;

  @ApiProperty()
  issuedAt!: string;

  @ApiPropertyOptional()
  issuedById?: string | null;

  @ApiPropertyOptional()
  controlGroup?: string;

  @ApiPropertyOptional({
    type: Object,
    description: 'W3C Verifiable Credential JSON-LD',
  })
  vcJson?: unknown;

  @ApiPropertyOptional()
  implementation?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({
    type: IntegrityStatusDto,
    description:
      'Integrity verification status (only included when verification is performed)',
  })
  integrityStatus?: IntegrityStatusDto;

  /**
   * Creates a CertificateResponseDto from a Certificate entity.
   *
   * @param cert - The certificate entity
   * @param integrityStatus - Optional integrity verification results
   */
  static fromEntity(
    cert: Certificate,
    integrityStatus?: IntegrityStatusDto,
  ): CertificateResponseDto {
    const dto = new CertificateResponseDto();
    dto.id = cert.id;
    dto.submissionId = cert.submissionId;
    dto.implementationId = cert.implementationId;
    dto.implementationName = cert.implementation?.name;
    dto.certificateNumber = cert.certificateNumber;
    dto.certificationResult = cert.certificationResult;
    dto.finalScore = cert.finalScore;
    // Handle date fields - PostgreSQL date type may return string or Date
    dto.validFrom =
      cert.validFrom instanceof Date
        ? cert.validFrom.toISOString()
        : String(cert.validFrom);
    dto.validUntil =
      cert.validUntil instanceof Date
        ? cert.validUntil.toISOString()
        : String(cert.validUntil);
    dto.verificationCode = cert.verificationCode;
    dto.isRevoked = cert.isRevoked;
    dto.revokedAt = cert.revokedAt?.toISOString() ?? null;
    dto.revocationReason = cert.revocationReason;
    dto.issuedAt =
      cert.issuedAt instanceof Date
        ? cert.issuedAt.toISOString()
        : String(cert.issuedAt);
    dto.issuedById = cert.issuedById;
    dto.controlGroup = cert.controlGroup;
    dto.vcJson = cert.vcJson;
    if (cert.implementation) {
      dto.implementation = {
        id: cert.implementation.id,
        name: cert.implementation.name,
      };
    }
    if (integrityStatus) {
      dto.integrityStatus = integrityStatus;
    }
    return dto;
  }
}

export class VerificationResultDto {
  @ApiProperty()
  valid!: boolean;

  @ApiPropertyOptional({ type: CertificateResponseDto })
  certificate?: CertificateResponseDto | undefined;

  @ApiProperty({
    description: 'Detailed verification check results',
  })
  checks!: {
    found: boolean;
    notRevoked: boolean;
    notExpired: boolean;
    integrityValid: boolean;
    signatureValid: boolean;
  };
}

export class CredentialResponseDto {
  @ApiProperty()
  '@context'!: string[];

  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string[];

  @ApiProperty()
  issuer!: {
    id: string;
    type: string;
    name: string;
  };

  @ApiProperty()
  validFrom!: string;

  @ApiProperty()
  validUntil!: string;

  @ApiProperty()
  credentialSubject!: unknown;

  @ApiProperty()
  credentialStatus!: unknown;

  @ApiPropertyOptional()
  proof?: unknown;
}
