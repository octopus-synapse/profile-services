/**
 * DSL Controller
 * Endpoints for DSL compilation and preview
 * Thin layer that delegates to DslRepository
 */

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { DslAstResponseDto, ResumeAstDto } from '@/shared-kernel';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { DslService } from './dsl.service';

/** DTO for DSL validation error */
export class DslValidationErrorDto {
  @ApiProperty({ example: 'root.name', description: 'Path to invalid field' })
  path!: string;

  @ApiProperty({ example: 'Required', description: 'Error message' })
  message!: string;
}

/** DTO for DSL validation result */
export class DslValidationResultDto {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiProperty({
    type: [DslValidationErrorDto],
    nullable: true,
    required: false,
  })
  errors!: DslValidationErrorDto[] | null;
}

/** DTO for DSL preview result */
export class DslPreviewResultDto {
  @ApiProperty({ description: 'Compiled AST', type: Object })
  ast!: ResumeAstDto;
}

type RenderTarget = 'html' | 'pdf';

@SdkExport({ tag: 'dsl', description: 'Dsl API' })
@ApiTags('dsl')
@Controller('v1/dsl')
export class DslController {
  constructor(private readonly dslService: DslService) {}

  /**
   * Validate DSL without compiling
   */
  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate DSL schema' })
  @ApiBody({ description: 'DSL object to validate' })
  @ApiDataResponse(DslValidationResultDto, {
    description: 'DSL validation result',
  })
  validate(@Body() body: Record<string, unknown>): DataResponse<DslValidationResultDto> {
    const result = this.dslService.validate(body);
    return { success: true, data: result as DslValidationResultDto };
  }

  /**
   * Preview: Compile DSL to AST without persisting
   * Used for live preview in the editor
   */
  @Public()
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compile DSL to AST (preview, no persistence)' })
  @ApiQuery({ name: 'target', enum: ['html', 'pdf'], required: false })
  @ApiBody({ description: 'DSL object to compile' })
  @ApiDataResponse(DslPreviewResultDto, {
    description: 'Preview AST compiled successfully',
  })
  preview(
    @Body() body: Record<string, unknown>,
    @Query('target') target: RenderTarget = 'html',
  ): DataResponse<DslPreviewResultDto> {
    const ast = this.dslService.preview(body, target);
    return { success: true, data: { ast } };
  }

  /**
   * Render: Get compiled AST for a persisted resume
   */
  @Get('render/:resumeId')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get compiled AST for a resume' })
  @ApiDataResponse(DslAstResponseDto, { description: 'AST for resume' })
  @ApiQuery({ name: 'target', enum: ['html', 'pdf'], required: false })
  async render(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
    @Query('target') target: RenderTarget = 'html',
  ): Promise<DataResponse<DslAstResponseDto>> {
    const result = await this.dslService.render(resumeId, user.userId, target);
    return { success: true, data: { ast: result.ast } };
  }

  /**
   * Public render (for shared/public resumes)
   */
  @Public()
  @Get('render/public/:slug')
  @ApiOperation({ summary: 'Get compiled AST for a public resume' })
  @ApiDataResponse(DslAstResponseDto, { description: 'AST for public resume' })
  @ApiQuery({ name: 'target', enum: ['html', 'pdf'], required: false })
  async renderPublic(
    @Param('slug') slug: string,
    @Query('target') target: RenderTarget = 'html',
  ): Promise<DataResponse<DslAstResponseDto>> {
    const result = await this.dslService.renderPublic(slug, target);
    return { success: true, data: { ast: result.ast } };
  }
}
