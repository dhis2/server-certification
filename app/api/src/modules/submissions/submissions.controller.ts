import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';
import { SubmissionsService, SubmissionSummary } from './services';
import {
  CreateSubmissionDto,
  SaveResponsesDto,
  FinalizeSubmissionDto,
  SubmissionResponseDto,
} from './dto';
import { SubmissionStatus, UserRole } from '../../common/enums';

export type SubmissionSummaryResponseDto = SubmissionSummary;

@ApiTags('Submissions')
@ApiBearerAuth('bearer')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'Create a new assessment submission' })
  @ApiResponse({ status: 201, type: SubmissionResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Implementation or Template not found',
  })
  async create(
    @Body() dto: CreateSubmissionDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.create(dto, user.sub);
    return SubmissionResponseDto.fromEntity(submission, false);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'List assessment submissions with pagination' })
  @ApiQuery({ name: 'implementationId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatus })
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
  @ApiResponse({ status: 200, description: 'Paginated list of submissions' })
  async findAll(
    @Query('implementationId') implementationId?: string,
    @Query('status') status?: SubmissionStatus,
    @Query('first') first?: string,
    @Query('after') after?: string,
  ) {
    const connection = await this.submissionsService.findAll({
      implementationId,
      status,
      first: first ? parseInt(first, 10) : undefined,
      after,
    });

    return {
      edges: connection.edges.map((edge) => ({
        node: SubmissionResponseDto.fromEntity(edge.node, false),
        cursor: edge.cursor,
      })),
      pageInfo: connection.pageInfo,
      totalCount: connection.totalCount,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'Get submission details' })
  @ApiResponse({ status: 200, type: SubmissionResponseDto })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.findOne(id);
    return SubmissionResponseDto.fromEntity(submission, true);
  }

  @Get(':id/summary')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'Get submission summary with pass/fail status' })
  @ApiResponse({ status: 200, description: 'Submission summary' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async getSummary(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubmissionSummaryResponseDto> {
    return this.submissionsService.getSummary(id);
  }

  @Patch(':id/responses')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'Save responses for a submission' })
  @ApiResponse({ status: 200, type: SubmissionResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid state or invalid criterion IDs',
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async saveResponses(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveResponsesDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.saveResponses(
      id,
      dto,
      user.sub,
    );
    return SubmissionResponseDto.fromEntity(submission, false);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'Mark submission as completed' })
  @ApiResponse({ status: 200, type: SubmissionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state for completion' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: ActiveUserData,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.complete(id, user.sub);
    return SubmissionResponseDto.fromEntity(submission, false);
  }

  @Post(':id/finalize')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'Finalize submission and determine pass/fail' })
  @ApiResponse({ status: 200, type: SubmissionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state for finalization' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async finalize(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto?: FinalizeSubmissionDto,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.finalize(
      id,
      user.sub,
      dto,
    );
    return SubmissionResponseDto.fromEntity(submission, false);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'Resume a failed assessment' })
  @ApiResponse({ status: 200, type: SubmissionResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Can only resume FAILED submissions',
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async resumeAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: ActiveUserData,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.resumeAssessment(
      id,
      user.sub,
    );
    return SubmissionResponseDto.fromEntity(submission, false);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'Withdraw a submission' })
  @ApiResponse({ status: 200, type: SubmissionResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cannot withdraw PASSED or already WITHDRAWN submissions',
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: ActiveUserData,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.withdraw(id, user.sub);
    return SubmissionResponseDto.fromEntity(submission, false);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft submission' })
  @ApiResponse({ status: 204, description: 'Submission deleted' })
  @ApiResponse({
    status: 400,
    description: 'Can only delete DRAFT submissions',
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: ActiveUserData,
  ): Promise<void> {
    await this.submissionsService.delete(id, user.sub);
  }
}
