import {
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  Type,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { UserPayload } from '../../../auth/interfaces/auth-request.interface';
import { BaseSubResourceService } from '../../services/base/base-sub-resource.service';
import { ReorderDto } from '../../dto/reorder.dto';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { PaginatedResult } from '../../dto/pagination.dto';
import {
  DataResponse,
  MessageResponse,
} from '../../../common/dto/api-response.dto';

/**
 * Configuration for the BaseSubResourceController
 */
export interface SubResourceControllerConfig<
  _Entity,
  CreateDto,
  UpdateDto,
  ResponseDto,
> {
  /** The name of the entity (singular, e.g., 'experience', 'education') */
  entityName: string;
  /** The plural name for API descriptions (e.g., 'experiences', 'education entries') */
  entityPluralName: string;
  /** The response DTO class for Swagger documentation */
  responseDtoClass: Type<ResponseDto>;
  /** The create DTO class for Swagger documentation */
  createDtoClass: Type<CreateDto>;
  /** The update DTO class for Swagger documentation */
  updateDtoClass: Type<UpdateDto>;
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
 * @template CreateDto - DTO for creating the entity
 * @template UpdateDto - DTO for updating the entity
 * @template ResponseDto - DTO for API responses
 */
export abstract class BaseSubResourceController<
  Entity,
  CreateDto,
  UpdateDto,
  ResponseDto,
> {
  protected abstract readonly config: SubResourceControllerConfig<
    Entity,
    CreateDto,
    UpdateDto,
    ResponseDto
  >;

  constructor(
    protected readonly service: BaseSubResourceService<
      Entity,
      CreateDto,
      UpdateDto
    >,
  ) {}

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
    return this.service.listForResume(resumeId, user.userId, page, limit);
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
    return this.service.getById(resumeId, entityId, user.userId);
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
    @Body() createDto: CreateDto,
  ): Promise<DataResponse<Entity>> {
    return this.service.addToResume(resumeId, user.userId, createDto);
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
    @Body() updateDto: UpdateDto,
  ): Promise<DataResponse<Entity>> {
    return this.service.updateById(resumeId, entityId, user.userId, updateDto);
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
    return this.service.deleteById(resumeId, entityId, user.userId);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder entities' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Entities reordered' })
  async reorder(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() reorderDto: ReorderDto,
  ): Promise<MessageResponse> {
    return this.service.reorderInResume(resumeId, user.userId, reorderDto.ids);
  }
}
