import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  ParseUUIDPipe,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';
import { Public } from '../iam/authentication/decorators/public.decorator';
import { CertificatesService } from './services/certificates.service';
import {
  IssueCertificateDto,
  RevokeCertificateDto,
  CertificateResponseDto,
  VerificationResultDto,
  CredentialResponseDto,
  IntegrityStatusDto,
} from './dto';
import {
  CacheControl,
  CacheControlInterceptor,
} from '../../common/interceptors';
import { PublicApiThrottle } from '../../common/decorators';
import {
  ParseVerificationCodePipe,
  ParseCertificateNumberPipe,
} from '../../common/pipes';

@Controller('certificates')
@ApiTags('Certificates')
@ApiBearerAuth('bearer')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Issue a certificate for an approved submission' })
  @ApiResponse({ status: 201, type: CertificateResponseDto })
  async issue(
    @Body() dto: IssueCertificateDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<CertificateResponseDto> {
    const certificate = await this.certificatesService.issueCertificate(
      dto.submissionId,
      user.sub,
    );
    return CertificateResponseDto.fromEntity(certificate);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl({ maxAge: 60, mustRevalidate: true }) // 1 minute cache
  @ApiOperation({ summary: 'List certificates with pagination' })
  @ApiQuery({ name: 'implementationId', required: false })
  @ApiQuery({
    name: 'first',
    required: false,
    type: Number,
    description: 'Number of items to fetch (max 100)',
  })
  @ApiQuery({
    name: 'after',
    required: false,
    type: String,
    description: 'Cursor for pagination',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of certificates' })
  async findAll(
    @Query('implementationId') implementationId?: string,
    @Query('first') first?: string,
    @Query('after') after?: string,
  ) {
    const connection = await this.certificatesService.findAll({
      implementationId,
      first: first ? parseInt(first, 10) : undefined,
      after,
    });

    return {
      edges: connection.edges.map((edge) => ({
        node: CertificateResponseDto.fromEntity(edge.node),
        cursor: edge.cursor,
      })),
      pageInfo: connection.pageInfo,
      totalCount: connection.totalCount,
    };
  }

  @Get('by-submission/:submissionId')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl({ maxAge: 300, mustRevalidate: true }) // 5 minute cache
  @ApiOperation({ summary: 'Get certificate by submission ID' })
  @ApiResponse({ status: 200, type: CertificateResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found for this submission',
  })
  async findBySubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ): Promise<CertificateResponseDto> {
    const certificate =
      await this.certificatesService.findBySubmissionId(submissionId);
    return CertificateResponseDto.fromEntity(certificate);
  }

  /**
   * Get certificate details with integrity verification.
   *
   * Per NIST SP 800-53 SI-7 (Software, Firmware, and Information Integrity):
   * - Performs cryptographic verification on every retrieval
   * - Returns integrity status alongside certificate data
   * - Logs security events on verification failures
   *
   * The response includes an `integrityStatus` object with verification results.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl({ maxAge: 60, mustRevalidate: true }) // 1 minute cache
  @ApiOperation({
    summary: 'Get certificate details with integrity verification',
  })
  @ApiResponse({ status: 200, type: CertificateResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CertificateResponseDto> {
    const { certificate, integrityStatus } =
      await this.certificatesService.findOneWithVerification(id);
    return CertificateResponseDto.fromEntity(
      certificate,
      integrityStatus as IntegrityStatusDto,
    );
  }

  @Get(':id/credential')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl({ maxAge: 3600, mustRevalidate: true }) // 1 hour cache - credentials are immutable
  @Header('Content-Type', 'application/vc+ld+json')
  @ApiOperation({ summary: 'Get W3C Verifiable Credential JSON' })
  @ApiResponse({ status: 200, type: CredentialResponseDto })
  async getCredential(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CredentialResponseDto> {
    const certificate = await this.certificatesService.findOne(id);
    return certificate.vcJson as CredentialResponseDto;
  }

  @Post(':id/revoke')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revoke a certificate' })
  @ApiResponse({ status: 200, type: CertificateResponseDto })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeCertificateDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<CertificateResponseDto> {
    const certificate = await this.certificatesService.revoke(
      id,
      dto.reason,
      user.sub,
    );
    return CertificateResponseDto.fromEntity(certificate);
  }
}

@Controller('verify')
@ApiTags('Verification')
@UseInterceptors(CacheControlInterceptor)
export class VerificationController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get(':code')
  @Public()
  @PublicApiThrottle()
  @CacheControl({ maxAge: 60, public: true, staleWhileRevalidate: 120 })
  @ApiOperation({
    summary: 'Verify a certificate by verification code (public)',
  })
  @ApiResponse({ status: 200, type: VerificationResultDto })
  @ApiResponse({ status: 400, description: 'Invalid verification code format' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async verify(
    @Param('code', ParseVerificationCodePipe) code: string,
  ): Promise<VerificationResultDto> {
    const result = await this.certificatesService.verify(code);
    return {
      valid: result.valid,
      certificate: result.certificate
        ? CertificateResponseDto.fromEntity(result.certificate)
        : undefined,
      checks: result.checks,
    };
  }

  @Get('number/:number')
  @Public()
  @PublicApiThrottle()
  @CacheControl({ maxAge: 60, public: true, staleWhileRevalidate: 120 })
  @ApiOperation({
    summary: 'Verify a certificate by certificate number (public)',
  })
  @ApiResponse({ status: 200, type: VerificationResultDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid certificate number format',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async verifyByNumber(
    @Param('number', ParseCertificateNumberPipe) number: string,
  ): Promise<VerificationResultDto> {
    try {
      const certificate =
        await this.certificatesService.findByCertificateNumber(number);
      const result = await this.certificatesService.verify(
        certificate.verificationCode ?? '',
      );
      return {
        valid: result.valid,
        certificate: result.certificate
          ? CertificateResponseDto.fromEntity(result.certificate)
          : undefined,
        checks: result.checks,
      };
    } catch {
      return {
        valid: false,
        checks: {
          found: false,
          notRevoked: false,
          notExpired: false,
          integrityValid: false,
          signatureValid: false,
        },
      };
    }
  }
}
