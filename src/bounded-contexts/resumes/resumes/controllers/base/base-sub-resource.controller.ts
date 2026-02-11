import {
  Body,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import {
  DataResponse,
  MessageResponse,
} from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ParseCuidPipe } from '@/bounded-contexts/platform/common/pipes/parse-cuid.pipe';
import type { PaginatedResult, ReorderItems } from '@/shared-kernel';
import { BaseSubResourceService } from '../../services/base/base-sub-resource.service';

/**
 * Configuration for the BaseSubResourceController
 */
export interface SubResourceControllerConfig<_Entity, _Create, _Update, _Response> {
  /** The name of the entity (singular, e.g., 'experience', 'education') */
  entityName: string;
  /** The plural name for API descriptions (e.g., 'experiences', 'education entries') */
  entityPluralName: string;
}

/**
 * Abstract base controller for resume sub-resources
 *
 * Provides common CRUD endpoints that are shared across all sub-resource controllers:
 * - GET / - List all entities with pagination
 * - GET /:id - Get a single entity
 * - POST / - Create a new entity
 * - PATCH /:id - Update an entity
 * - DELETE /:id - Delete an entity
 * - POST /reorder - Reorder entities
 *
 * Following Uncle Bob's principles:
 * - DRY: Eliminates duplication across 15+ controllers
 * - SRP: Single responsibility - HTTP handling for sub-resources
 * - OCP: Open for extension through inheritance
 *
 * @template Entity - The entity type
 * @template Create - DTO for creating the entity
 * @template Update - DTO for updating the entity
 * @template Response - DTO for API responses
 */
export abstract class BaseSubResourceController<Entity, Create, Update, Response> {
  protected abstract readonly config: SubResourceControllerConfig<Entity, Create, Update, Response>;

  constructor(protected readonly service: BaseSubResourceService<Entity, Create, Update>) {}

  @Get()
  @ApiOperation({ summary: 'Get all entities for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of entities' })
  async listAll(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedResult<Entity>> {
    return this.service.listAllEntitiesForResume(resumeId, user.userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific entity' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Entity ID' })
  @ApiResponse({ status: 200, description: 'Entity found' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async getOne(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) entityId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<Entity>> {
    return this.service.getEntityByIdForResume(resumeId, entityId, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new entity' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 201, description: 'Entity created' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async add(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() createDto: Create,
  ): Promise<DataResponse<Entity>> {
    return this.service.addEntityToResume(resumeId, user.userId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an entity' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Entity ID' })
  @ApiResponse({ status: 200, description: 'Entity updated' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async edit(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) entityId: string,
    @CurrentUser() user: UserPayload,
    @Body() updateDto: Update,
  ): Promise<DataResponse<Entity>> {
    return this.service.updateEntityByIdForResume(resumeId, entityId, user.userId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an entity' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Entity ID' })
  @ApiResponse({ status: 200, description: 'Entity deleted' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async delete(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) entityId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<MessageResponse> {
    return this.service.deleteEntityByIdForResume(resumeId, entityId, user.userId);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder entities' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Entities reordered' })
  async reorder(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() reorderDto: ReorderItems,
  ): Promise<MessageResponse> {
    return this.service.reorderEntitiesInResume(resumeId, user.userId, reorderDto.ids);
  }
}
