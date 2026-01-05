/**
 * DSL Controller
 * Endpoints for DSL compilation and preview
 * Thin layer that delegates to DslRepository
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DslRepository } from './dsl.repository';

type RenderTarget = 'html' | 'pdf';

@ApiTags('dsl')
@Controller('v1/dsl')
export class DslController {
  constructor(private readonly repository: DslRepository) {}

  /**
   * Validate DSL without compiling
   */
  @Post('validate')
  @ApiOperation({ summary: 'Validate DSL schema' })
  @ApiBody({ description: 'DSL object to validate' })
  validate(@Body() body: unknown) {
    return this.repository.validate(body);
  }

  /**
   * Preview: Compile DSL to AST without persisting
   * Used for live preview in the editor
   */
  @Post('preview')
  @ApiOperation({ summary: 'Compile DSL to AST (preview, no persistence)' })
  @ApiQuery({ name: 'target', enum: ['html', 'pdf'], required: false })
  @ApiBody({ description: 'DSL object to compile' })
  preview(
    @Body() body: unknown,
    @Query('target') target: RenderTarget = 'html',
  ) {
    const ast = this.repository.preview(body, target);
    return { ast };
  }

  /**
   * Render: Get compiled AST for a persisted resume
   */
  @Get('render/:resumeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get compiled AST for a resume' })
  @ApiQuery({ name: 'target', enum: ['html', 'pdf'], required: false })
  async render(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Query('target') target: RenderTarget = 'html',
  ) {
    return this.repository.render(resumeId, userId, target);
  }

  /**
   * Public render (for shared/public resumes)
   */
  @Get('render/public/:slug')
  @ApiOperation({ summary: 'Get compiled AST for a public resume' })
  @ApiQuery({ name: 'target', enum: ['html', 'pdf'], required: false })
  async renderPublic(
    @Param('slug') slug: string,
    @Query('target') target: RenderTarget = 'html',
  ) {
    return this.repository.renderPublic(slug, target);
  }
}
