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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard, RequirePermission } from '@/bounded-contexts/identity/authorization';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ZodValidationPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { AdminSectionTypesService } from './admin-section-types.service';
import {
  type CreateSectionTypeDto,
  CreateSectionTypeSchema,
  type ListSectionTypesQueryDto,
  ListSectionTypesQuerySchema,
  type UpdateSectionTypeDto,
  UpdateSectionTypeSchema,
} from './dto';

@ApiTags('Admin - Section Types')
@ApiExcludeController()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('section_types', 'manage')
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
  @ApiResponse({ status: 200, description: 'List of section types' })
  async findAll(
    @Query(new ZodValidationPipe(ListSectionTypesQuerySchema))
    query: ListSectionTypesQueryDto,
  ) {
    const result = await this.service.findAll(query);
    return { success: true, data: result };
  }

  @Get('semantic-kinds')
  @ApiOperation({ summary: 'Get all unique semantic kinds' })
  @ApiResponse({ status: 200, description: 'List of semantic kinds' })
  async getSemanticKinds() {
    const result = await this.service.getSemanticKinds();
    return { success: true, data: result };
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a section type by key' })
  @ApiParam({ name: 'key', description: 'Section type key (e.g., work_experience_v1)' })
  @ApiResponse({ status: 200, description: 'Section type details' })
  @ApiResponse({ status: 404, description: 'Section type not found' })
  async findOne(@Param('key') key: string) {
    const result = await this.service.findOne(key);
    return { success: true, data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new section type' })
  @ApiResponse({ status: 201, description: 'Section type created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Section type already exists' })
  async create(
    @Body(new ZodValidationPipe(CreateSectionTypeSchema))
    dto: CreateSectionTypeDto,
  ) {
    const result = await this.service.create(dto);
    return { success: true, data: result };
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a section type' })
  @ApiParam({ name: 'key', description: 'Section type key' })
  @ApiResponse({ status: 200, description: 'Section type updated' })
  @ApiResponse({ status: 400, description: 'Validation error or restricted update' })
  @ApiResponse({ status: 404, description: 'Section type not found' })
  async update(
    @Param('key') key: string,
    @Body(new ZodValidationPipe(UpdateSectionTypeSchema))
    dto: UpdateSectionTypeDto,
  ) {
    const result = await this.service.update(key, dto);
    return { success: true, data: result };
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a section type' })
  @ApiParam({ name: 'key', description: 'Section type key' })
  @ApiResponse({ status: 204, description: 'Section type deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete system or in-use section type' })
  @ApiResponse({ status: 404, description: 'Section type not found' })
  async remove(@Param('key') key: string) {
    await this.service.remove(key);
    // 204 No Content - no body
  }
}
