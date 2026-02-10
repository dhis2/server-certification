import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
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
import { TemplatesService } from './templates.service';
import { TemplateLoaderService } from './services/template-loader.service';
import { TemplateValidatorService } from './services/template-validator.service';
import { TemplateRegistryService } from './services/template-registry.service';
import { CategoryService } from './services/category.service';
import { CriterionService } from './services/criterion.service';
import { TemplateVersioningService } from './services/template-versioning.service';
import {
  CreateTemplateDto,
  CreateCategoryDto,
  CreateCriterionDto,
  UpdateTemplateDto,
  UpdateCategoryDto,
  UpdateCriterionDto,
  TemplateResponseDto,
  CategoryResponseDto,
  CriterionResponseDto,
  TemplateListResponseDto,
  TemplateImportDto,
  ImportFormat,
  TemplateFileDto,
  ImportResultDto,
  ExportResultDto,
  ValidationResultDto,
  TemplateConfigDto,
} from './dto';
import {
  CacheControl,
  CacheControlInterceptor,
} from '../../common/interceptors';

@ApiTags('Templates')
@ApiBearerAuth('bearer')
@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly loaderService: TemplateLoaderService,
    private readonly validatorService: TemplateValidatorService,
    private readonly registryService: TemplateRegistryService,
    private readonly categoryService: CategoryService,
    private readonly criterionService: CriterionService,
    private readonly versioningService: TemplateVersioningService,
  ) {}

  @Get('config')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl({ maxAge: 3600, public: true })
  @ApiOperation({
    summary: 'Get template validation configuration',
    description:
      'Returns validation limits for template import. Cacheable for 1 hour.',
  })
  @ApiResponse({ status: 200, type: TemplateConfigDto })
  getConfig(): TemplateConfigDto {
    return TemplateConfigDto.fromConstants();
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl({ maxAge: 60, mustRevalidate: true }) // 1 minute private cache
  @ApiOperation({ summary: 'List assessment templates with pagination' })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
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
  @ApiResponse({ status: 200, description: 'Paginated list of templates' })
  async findAll(
    @Query('isPublished') isPublished?: string,
    @Query('search') search?: string,
    @Query('first') first?: string,
    @Query('after') after?: string,
  ) {
    const connection = await this.templatesService.findAll({
      isPublished:
        isPublished === 'true'
          ? true
          : isPublished === 'false'
            ? false
            : undefined,
      search: search ?? undefined,
      first: first ? parseInt(first, 10) : undefined,
      after,
    });

    return {
      edges: connection.edges.map((edge) => ({
        node: TemplateResponseDto.fromEntity(edge.node, false),
        cursor: edge.cursor,
      })),
      pageInfo: connection.pageInfo,
      totalCount: connection.totalCount,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl({ maxAge: 300, mustRevalidate: true }) // 5 minute cache (published templates don't change)
  @ApiOperation({ summary: 'Get template by ID with full details' })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TemplateResponseDto> {
    const template = await this.templatesService.findOne(id);
    return TemplateResponseDto.fromEntity(template, true);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new assessment template' })
  @ApiResponse({ status: 201, type: TemplateResponseDto })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  async create(
    @Body() dto: CreateTemplateDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<TemplateResponseDto> {
    const template = await this.templatesService.create(dto, user.sub);
    return TemplateResponseDto.fromEntity(template, true);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a template (draft only)' })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot update published template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    const template = await this.templatesService.update(id, dto);
    return TemplateResponseDto.fromEntity(template, true);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template (draft only)' })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete published template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.templatesService.delete(id);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish a template' })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  @ApiResponse({ status: 400, description: 'Template validation failed' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TemplateResponseDto> {
    const template = await this.versioningService.publish(id);
    return TemplateResponseDto.fromEntity(template, true);
  }

  @Post(':id/version')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new version from a published template' })
  @ApiResponse({ status: 201, type: TemplateResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Can only version published templates',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createNewVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: ActiveUserData,
  ): Promise<TemplateResponseDto> {
    const template = await this.versioningService.createNewVersion(
      id,
      user.sub,
    );
    return TemplateResponseDto.fromEntity(template, true);
  }

  // Category endpoints
  @Post(':templateId/categories')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a category to a template' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cannot add to published template',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async addCategory(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.addCategory(templateId, dto);
    return CategoryResponseDto.fromEntity(category, true);
  }

  @Patch('categories/:categoryId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cannot update in published template',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.updateCategory(categoryId, dto);
    return CategoryResponseDto.fromEntity(category, true);
  }

  @Delete('categories/:categoryId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete from published template',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<void> {
    await this.categoryService.deleteCategory(categoryId);
  }

  // Criterion endpoints
  @Post('categories/:categoryId/criteria')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a criterion to a category' })
  @ApiResponse({ status: 201, type: CriterionResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cannot add to published template',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Criterion code already exists' })
  async addCriterion(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: CreateCriterionDto,
  ): Promise<CriterionResponseDto> {
    const criterion = await this.criterionService.addCriterion(categoryId, dto);
    return CriterionResponseDto.fromEntity(criterion);
  }

  @Patch('criteria/:criterionId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a criterion' })
  @ApiResponse({ status: 200, type: CriterionResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cannot update in published template',
  })
  @ApiResponse({ status: 404, description: 'Criterion not found' })
  async updateCriterion(
    @Param('criterionId', ParseUUIDPipe) criterionId: string,
    @Body() dto: UpdateCriterionDto,
  ): Promise<CriterionResponseDto> {
    const criterion = await this.criterionService.updateCriterion(
      criterionId,
      dto,
    );
    return CriterionResponseDto.fromEntity(criterion);
  }

  @Delete('criteria/:criterionId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a criterion' })
  @ApiResponse({ status: 204, description: 'Criterion deleted' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete from published template',
  })
  @ApiResponse({ status: 404, description: 'Criterion not found' })
  async deleteCriterion(
    @Param('criterionId', ParseUUIDPipe) criterionId: string,
  ): Promise<void> {
    await this.criterionService.deleteCriterion(criterionId);
  }

  @Post('import')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Import template from YAML/JSON content' })
  @ApiResponse({ status: 201, type: ImportResultDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid template format or validation failed',
  })
  async importTemplate(
    @Body() dto: TemplateImportDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<ImportResultDto> {
    const content =
      dto.format === ImportFormat.JSON
        ? JSON.stringify(JSON.parse(dto.content))
        : dto.content;

    return this.loaderService.syncFromContent(content, user.sub);
  }

  @Post('import/file')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Import template from file in templates directory' })
  @ApiResponse({ status: 201, type: ImportResultDto })
  @ApiResponse({ status: 400, description: 'File not found or invalid' })
  async importFromFile(
    @Body() dto: TemplateFileDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<ImportResultDto> {
    return this.loaderService.syncFromFile(dto.filename, user.sub);
  }

  @Post('import/validate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate template content without importing' })
  @ApiResponse({ status: 200, type: ValidationResultDto })
  async validateTemplate(
    @Body() dto: TemplateImportDto,
  ): Promise<ValidationResultDto> {
    const definition = this.loaderService.loadFromContent(dto.content);
    return await this.validatorService.validate(definition);
  }

  @Get(':id/export')
  @Roles(UserRole.ADMIN)
  @Header('Content-Type', 'application/x-yaml')
  @ApiOperation({ summary: 'Export template as YAML' })
  @ApiResponse({ status: 200, type: ExportResultDto })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async exportTemplate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExportResultDto> {
    const template = await this.templatesService.findOne(id);
    const content = await this.loaderService.exportToYaml(id);
    const filename = `${template.name.toLowerCase().replace(/\s+/g, '-')}-v${String(template.version)}.yaml`;

    return {
      content,
      filename,
      contentType: 'application/x-yaml',
    };
  }

  @Get('registry/active/:name')
  @Roles(UserRole.ADMIN, UserRole.ASSESSOR)
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl({ maxAge: 300, mustRevalidate: true })
  @ApiOperation({ summary: 'Get active (latest published) template by name' })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  @ApiResponse({ status: 404, description: 'No published template found' })
  async getActiveTemplate(
    @Param('name') name: string,
  ): Promise<TemplateResponseDto> {
    const template = await this.registryService.getActiveTemplate(
      decodeURIComponent(name),
    );
    return TemplateResponseDto.fromEntity(template, true);
  }

  @Get('registry/versions/:name')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all versions of a template' })
  @ApiResponse({ status: 200, type: [TemplateResponseDto] })
  async getTemplateVersions(
    @Param('name') name: string,
  ): Promise<TemplateResponseDto[]> {
    const templates = await this.registryService.getTemplateVersions(
      decodeURIComponent(name),
    );
    return templates.map((t) => TemplateResponseDto.fromEntity(t, false));
  }

  @Get('registry/diff/:name')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Compare two versions of a template' })
  @ApiQuery({ name: 'from', required: true, type: Number })
  @ApiQuery({ name: 'to', required: true, type: Number })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async diffVersions(
    @Param('name') name: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<{
    fromVersion: number;
    toVersion: number;
    changes: Array<{
      type: 'added' | 'removed' | 'modified';
      path: string;
      oldValue?: unknown;
      newValue?: unknown;
    }>;
  }> {
    return this.registryService.diffVersions(
      decodeURIComponent(name),
      parseInt(from, 10),
      parseInt(to, 10),
    );
  }

  @Get('registry/statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get template statistics' })
  @ApiResponse({ status: 200 })
  async getStatistics(): Promise<{
    totalTemplates: number;
    publishedTemplates: number;
    draftTemplates: number;
    totalCategories: number;
    totalCriteria: number;
  }> {
    return this.registryService.getStatistics();
  }

  @Post('sync')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Sync all templates from files directory' })
  @ApiResponse({ status: 200, type: [ImportResultDto] })
  async syncAllTemplates(): Promise<ImportResultDto[]> {
    return this.loaderService.syncAllFromFiles();
  }
}
