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
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';
import { ImplementationsService } from './services/implementations.service';
import { CreateImplementationDto } from './dto/create-implementation.dto';
import { UpdateImplementationDto } from './dto/update-implementation.dto';
import { ImplementationResponseDto } from './dto/implementation-response.dto';

@Controller('implementations')
@ApiTags('Implementations')
@ApiBearerAuth('bearer')
export class ImplementationsController {
  constructor(
    private readonly implementationsService: ImplementationsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new implementation' })
  @ApiResponse({
    status: 201,
    description: 'Implementation created successfully',
    type: ImplementationResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Implementation name already exists',
  })
  async create(
    @Body() dto: CreateImplementationDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<ImplementationResponseDto> {
    const implementation = await this.implementationsService.create(
      dto,
      user.sub,
    );
    return ImplementationResponseDto.fromEntity(implementation);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'List all implementations with pagination' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or country',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Paginated list of implementations',
  })
  async findAll(
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
    @Query('first') first?: string,
    @Query('after') after?: string,
  ) {
    const connection = await this.implementationsService.findAll({
      isActive,
      search,
      first: first ? parseInt(first, 10) : undefined,
      after,
    });

    return {
      edges: connection.edges.map((edge) => ({
        node: ImplementationResponseDto.fromEntity(edge.node),
        cursor: edge.cursor,
      })),
      pageInfo: connection.pageInfo,
      totalCount: connection.totalCount,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @ApiOperation({ summary: 'Get implementation by ID' })
  @ApiParam({
    name: 'id',
    description: 'Implementation ID (UUID)',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Implementation found',
    type: ImplementationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Implementation not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImplementationResponseDto> {
    const implementation = await this.implementationsService.findOne(id);
    return ImplementationResponseDto.fromEntity(implementation);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an implementation' })
  @ApiParam({
    name: 'id',
    description: 'Implementation ID (UUID)',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Implementation updated successfully',
    type: ImplementationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Implementation not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateImplementationDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<ImplementationResponseDto> {
    const implementation = await this.implementationsService.update(
      id,
      dto,
      user.sub,
    );
    return ImplementationResponseDto.fromEntity(implementation);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an implementation' })
  @ApiParam({
    name: 'id',
    description: 'Implementation ID (UUID)',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  @ApiResponse({
    status: 204,
    description: 'Implementation deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Implementation not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: ActiveUserData,
  ): Promise<void> {
    await this.implementationsService.remove(id, user.sub);
  }
}
