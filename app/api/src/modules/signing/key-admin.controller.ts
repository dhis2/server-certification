import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { RolesGuard } from '../iam/authorization/guards/roles.guard';
import { UserRole } from '../../common/enums';
import {
  KeyRotationService,
  KeyRotationCheckResult,
  KeyRotationPolicy,
  KeyHealthStatus,
} from './services';

/**
 * DTO for key health response.
 */
class KeyHealthDto {
  status!: KeyHealthStatus;
  keyId!: string | null;
  keyVersion!: number;
  createdAt!: string | null;
  ageInDays!: number | null;
  maxAgeDays!: number;
  warningThresholdDays!: number;
  daysUntilRotation!: number | null;
  message!: string;
  recommendations!: string[];
}

/**
 * DTO for key rotation report response.
 */
class KeyRotationReportDto {
  currentKey!: KeyHealthDto;
  policy!: KeyRotationPolicy;
  nextRotationDate!: string | null;
  complianceStatus!: 'compliant' | 'non-compliant' | 'unknown';
}

/**
 * Admin controller for key management operations.
 *
 * Per NIST SP 800-57 and OWASP Key Management guidelines:
 * - Key health monitoring should be accessible to administrators
 * - Key rotation status should be regularly checked
 * - Non-compliance should trigger alerts
 *
 * All endpoints require ADMIN role.
 */
@Controller({ path: 'admin/keys', version: '1' })
@ApiTags('Key Management (Admin)')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class KeyAdminController {
  constructor(private readonly keyRotationService: KeyRotationService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Check signing key health status',
    description:
      'Returns the current health status of the signing key including age, ' +
      'rotation status, and recommendations per NIST SP 800-57 guidelines. ' +
      'Requires ADMIN role.',
  })
  @ApiOkResponse({
    description: 'Key health status',
    type: KeyHealthDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires ADMIN role',
  })
  async getKeyHealth(): Promise<KeyRotationCheckResult> {
    return this.keyRotationService.checkKeyRotation();
  }

  @Get('rotation-report')
  @ApiOperation({
    summary: 'Generate key rotation compliance report',
    description:
      'Generates a comprehensive report on key rotation status including ' +
      'current key health, rotation policy, next rotation date, and ' +
      'compliance status per NIST SP 800-57. Requires ADMIN role.',
  })
  @ApiOkResponse({
    description: 'Key rotation compliance report',
    type: KeyRotationReportDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires ADMIN role',
  })
  async getRotationReport(): Promise<{
    currentKey: KeyRotationCheckResult;
    policy: KeyRotationPolicy;
    nextRotationDate: string | null;
    complianceStatus: 'compliant' | 'non-compliant' | 'unknown';
  }> {
    return this.keyRotationService.generateRotationReport();
  }

  @Get('policy')
  @ApiOperation({
    summary: 'Get key rotation policy',
    description:
      'Returns the current key rotation policy configuration. ' +
      'Policy is based on NIST SP 800-57 recommendations. Requires ADMIN role.',
  })
  @ApiOkResponse({
    description: 'Current key rotation policy',
    schema: {
      type: 'object',
      properties: {
        maxAgeDays: {
          type: 'number',
          description: 'Maximum key age in days before rotation is required',
          example: 365,
        },
        warningThresholdDays: {
          type: 'number',
          description: 'Days before max age to start warning',
          example: 30,
        },
        checkOnStartup: {
          type: 'boolean',
          description: 'Whether key health is checked on application startup',
          example: true,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires ADMIN role',
  })
  getPolicy(): KeyRotationPolicy {
    return this.keyRotationService.getPolicy();
  }
}
