import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { ZodValidationPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminSectionTypesService } from './admin-section-types.service';
import {
  type CreateSectionTypeDto,
  CreateSectionTypeSchema,
  type ListSectionTypesQueryDto,
  ListSectionTypesQuerySchema,
  SectionTypeDataDto,
  SectionTypeListDataDto,
  SemanticKindsDataDto,
  type UpdateSectionTypeDto,
  UpdateSectionTypeSchema,
} from './dto';

@SdkExport({
  tag: 'admin-section-types',
  description: 'Admin Section Types Management API',
  requiresAuth: true,
})
@ApiTags('Admin - Section Types')
@ApiBearerAuth()
@RequirePermission(Permission.SECTION_TYPE_MANAGE)
@Controller('v1/admin/section-types')
export class AdminSectionTypesController {
  constructor(private readonly service: AdminSectionTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List all section types with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'semanticKind', required: false, type: String })
  @ApiDataResponse(SectionTypeListDataDto, { description: 'List of section types' })
  async findAll(
    @Query(new ZodValidationPipe(ListSectionTypesQuerySchema))
    query: ListSectionTypesQueryDto,
  ) {
    return this.service.findAll(query);
  }

  @Get('semantic-kinds')
  @ApiOperation({ summary: 'Get all unique semantic kinds' })
  @ApiDataResponse(SemanticKindsDataDto, { description: 'List of semantic kinds' })
  async getSemanticKinds() {
    return this.service.getSemanticKinds();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a section type by key' })
  @ApiParam({ name: 'key', description: 'Section type key (e.g., work_experience_v1)' })
  @ApiDataResponse(SectionTypeDataDto, { description: 'Section type details' })
  async findOne(@Param('key') key: string) {
    return this.service.findOne(key);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new section type' })
  @ApiDataResponse(SectionTypeDataDto, { description: 'Section type created', status: 201 })
  async create(
    @Body(new ZodValidationPipe(CreateSectionTypeSchema))
    dto: CreateSectionTypeDto,
  ) {
    return this.service.create(dto);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a section type' })
  @ApiParam({ name: 'key', description: 'Section type key' })
  @ApiDataResponse(SectionTypeDataDto, { description: 'Section type updated' })
  async update(
    @Param('key') key: string,
    @Body(new ZodValidationPipe(UpdateSectionTypeSchema))
    dto: UpdateSectionTypeDto,
  ) {
    return this.service.update(key, dto);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a section type' })
  @ApiParam({ name: 'key', description: 'Section type key' })
  @ApiEmptyDataResponse({ description: 'Section type deleted', status: 204 })
  async remove(@Param('key') key: string) {
    await this.service.remove(key);
    // 204 No Content - no body
  }
}
