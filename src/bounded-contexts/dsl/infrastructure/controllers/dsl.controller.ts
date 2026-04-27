/**
 * DSL Controller — thin HTTP wire over the DSL use cases.
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
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { DslAstResponseDto, ResumeAstDto } from '@/shared-kernel/schemas/resume-ast';
import { parseLocale, SUPPORTED_LOCALES } from '@/shared-kernel/utils/locale-resolver';
import { PreviewDslUseCase } from '../../application/use-cases/preview-dsl/preview-dsl.use-case';
import { RenderPublicResumeDslUseCase } from '../../application/use-cases/render-public-resume-dsl/render-public-resume-dsl.use-case';
import { RenderResumeDslUseCase } from '../../application/use-cases/render-resume-dsl/render-resume-dsl.use-case';
import { ValidateDslUseCase } from '../../application/use-cases/validate-dsl/validate-dsl.use-case';

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

  @ApiProperty({ type: [DslValidationErrorDto], nullable: true, required: false })
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
  constructor(
    private readonly validateDsl: ValidateDslUseCase,
    private readonly previewDsl: PreviewDslUseCase,
    private readonly renderResumeDsl: RenderResumeDslUseCase,
    private readonly renderPublicResumeDsl: RenderPublicResumeDslUseCase,
  ) {}

  /**
   * Validate DSL without compiling
   */
  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate DSL schema' })
  @ApiBody({ description: 'DSL object to validate' })
  @ApiDataResponse(DslValidationResultDto, { description: 'DSL validation result' })
  validate(@Body() body: Record<string, unknown>): DataResponse<DslValidationResultDto> {
    const result = this.validateDsl.execute(body);
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
  @ApiDataResponse(DslPreviewResultDto, { description: 'Preview AST compiled successfully' })
  preview(
    @Body() body: Record<string, unknown>,
    @Query('target') target: RenderTarget = 'html',
  ): DataResponse<DslPreviewResultDto> {
    const ast = this.previewDsl.execute(body, target);
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
  @ApiQuery({
    name: 'locale',
    enum: SUPPORTED_LOCALES,
    required: false,
    description: 'Locale for translated section titles',
  })
  async render(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
    @Query('target') target: RenderTarget = 'html',
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<DslAstResponseDto>> {
    const result = await this.renderResumeDsl.execute({
      resumeId,
      userId: user.userId,
      target,
      locale: parseLocale(localeParam),
    });
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
  @ApiQuery({
    name: 'locale',
    enum: SUPPORTED_LOCALES,
    required: false,
    description: 'Locale for translated section titles',
  })
  async renderPublic(
    @Param('slug') slug: string,
    @Query('target') target: RenderTarget = 'html',
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<DslAstResponseDto>> {
    const result = await this.renderPublicResumeDsl.execute({
      slug,
      target,
      locale: parseLocale(localeParam),
    });
    return { success: true, data: { ast: result.ast } };
  }
}
