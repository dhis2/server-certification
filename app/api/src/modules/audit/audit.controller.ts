import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuditService } from './services/audit.service';
import { AuditRetentionService } from './services/audit-retention.service';
import { AuditIntegrityService } from './services/audit-integrity.service';
import {
  AuditLogResponseDto,
  HashChainValidationResponseDto,
  AuditStatisticsResponseDto,
  IntegrityValidationResponseDto,
  AuditRetentionPolicyDto,
  RetentionCleanupResultDto,
  RetentionStatisticsDto,
  RetentionComplianceReportDto,
} from './dto/audit-log-response.dto';
import {
  QueryAuditLogDto,
  ValidateHashChainDto,
} from './dto/query-audit-log.dto';

/**
 * AuditController provides endpoints for audit log management and compliance.
 *
 * Per NIST SP 800-92 and OWASP Logging Cheat Sheet:
 * - Administrative access only for audit log viewing
 * - Integrity validation endpoints for tamper detection
 * - Retention policy management for compliance
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-92/final
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
 */
@Controller('audit')
@ApiTags('Audit')
@ApiBearerAuth('bearer')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly retentionService: AuditRetentionService,
    private readonly integrityService: AuditIntegrityService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List audit logs with cursor-based pagination (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  async findAll(@Query() query: QueryAuditLogDto) {
    const connection = await this.auditService.findAll({
      entityType: query.entityType,
      entityId: query.entityId,
      eventType: query.eventType,
      actorId: query.actorId,
      action: query.action,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      first: query.first,
      after: query.after,
    });

    return {
      edges: connection.edges.map((edge) => ({
        node: AuditLogResponseDto.fromEntity(edge.node),
        cursor: edge.cursor,
      })),
      pageInfo: connection.pageInfo,
      totalCount: connection.totalCount,
    };
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit log statistics (admin only)' })
  @ApiResponse({ status: 200, type: AuditStatisticsResponseDto })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditStatisticsResponseDto> {
    return this.auditService.getStatistics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('validate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate hash chain integrity (admin only)' })
  @ApiResponse({ status: 200, type: HashChainValidationResponseDto })
  async validateHashChain(
    @Query() query: ValidateHashChainDto,
  ): Promise<HashChainValidationResponseDto> {
    return this.auditService.validateHashChain({
      startId: query.startId,
      endId: query.endId,
      limit: query.limit,
    });
  }

  // ===== Integrity Validation Endpoints (NIST SP 800-92) =====

  @Get('integrity/validate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Validate full audit log integrity (hash chain + signatures)',
    description:
      'Performs comprehensive integrity validation including hash chain verification ' +
      'and HMAC signature verification per NIST SP 800-92 guidelines.',
  })
  @ApiResponse({ status: 200, type: IntegrityValidationResponseDto })
  async validateIntegrity(
    @Query() query: ValidateHashChainDto,
  ): Promise<IntegrityValidationResponseDto> {
    return this.auditService.validateIntegrity({
      startId: query.startId,
      endId: query.endId,
      limit: query.limit,
    });
  }

  @Get('integrity/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get integrity service status',
    description:
      'Returns the current status of the audit integrity service including HMAC key configuration.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        hmacConfigured: { type: 'boolean' },
        keyFingerprint: { type: 'string', nullable: true },
      },
    },
  })
  getIntegrityStatus(): {
    hmacConfigured: boolean;
    keyFingerprint: string | null;
  } {
    return {
      hmacConfigured: this.integrityService.isConfigured(),
      keyFingerprint: this.integrityService.getKeyFingerprint(),
    };
  }

  // ===== Retention Policy Endpoints (NIST SP 800-92) =====

  @Get('retention/policy')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get current audit log retention policy',
    description:
      'Returns the current retention policy configuration per NIST SP 800-92 guidelines.',
  })
  @ApiResponse({ status: 200, type: AuditRetentionPolicyDto })
  getRetentionPolicy(): AuditRetentionPolicyDto {
    return this.retentionService.getPolicy();
  }

  @Get('retention/statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get retention statistics',
    description: 'Returns statistics on logs pending archival/cleanup.',
  })
  @ApiResponse({ status: 200, type: RetentionStatisticsDto })
  async getRetentionStatistics(): Promise<RetentionStatisticsDto> {
    return this.retentionService.getCleanupStatistics();
  }

  @Get('retention/compliance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Generate retention compliance report',
    description:
      'Generates a comprehensive compliance report for audit log retention ' +
      'per NIST SP 800-92 and SOC 2 requirements.',
  })
  @ApiResponse({ status: 200, type: RetentionComplianceReportDto })
  async getRetentionCompliance(): Promise<RetentionComplianceReportDto> {
    return this.retentionService.generateComplianceReport();
  }

  @Post('retention/cleanup')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Trigger manual retention cleanup',
    description:
      'Manually triggers the retention cleanup process. Use dryRun=true to preview ' +
      'what would be cleaned up without making changes.',
  })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean })
  @ApiQuery({ name: 'batchSize', required: false, type: Number })
  @ApiResponse({ status: 200, type: RetentionCleanupResultDto })
  async triggerCleanup(
    @Query('dryRun') dryRun?: string,
    @Query('batchSize') batchSize?: string,
  ): Promise<RetentionCleanupResultDto> {
    return this.retentionService.performCleanup({
      dryRun: dryRun === 'true',
      batchSize: batchSize ? parseInt(batchSize, 10) : undefined,
    });
  }

  // ===== Entity-specific and ID-based routes (must come after specific routes) =====

  @Get('entity/:entityType/:entityId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiParam({ name: 'entityType', example: 'Certificate' })
  @ApiParam({
    name: 'entityId',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<AuditLogResponseDto[]> {
    const logs = await this.auditService.findByEntity(entityType, entityId);
    return logs.map(AuditLogResponseDto.fromEntity);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit log entry by ID' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiResponse({ status: 200, type: AuditLogResponseDto })
  @ApiResponse({ status: 404, description: 'Audit log entry not found' })
  async findOne(@Param('id') id: string): Promise<AuditLogResponseDto> {
    const log = await this.auditService.findOne(id);

    if (!log) {
      throw new NotFoundException(`Audit log entry ${id} not found`);
    }

    return AuditLogResponseDto.fromEntity(log);
  }
}
