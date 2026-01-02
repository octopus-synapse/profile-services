/**
 * DSL Controller
 * Endpoints for DSL compilation and preview
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
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
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { PrismaService } from '../prisma/prisma.service';

type RenderTarget = 'html' | 'pdf';

@ApiTags('dsl')
@Controller('dsl')
export class DslController {
  constructor(
    private compiler: DslCompilerService,
    private validator: DslValidatorService,
    private prisma: PrismaService,
  ) {}

  /**
   * Validate DSL without compiling
   */
  @Post('validate')
  @ApiOperation({ summary: 'Validate DSL schema' })
  @ApiBody({ description: 'DSL object to validate' })
  validate(@Body() body: unknown) {
    const result = this.validator.validate(body);
    return {
      valid: result.valid,
      errors: result.errors ?? null,
    };
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
    try {
      const ast = this.compiler.compileFromRaw(body, target);
      return { ast };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to compile DSL');
    }
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
    // Fetch resume with theme
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: { activeTheme: true },
    });

    if (!resume) {
      throw new BadRequestException('Resume not found');
    }

    // Build DSL from theme + customizations
    const baseDsl = (resume.activeTheme?.styleConfig ?? {}) as Record<
      string,
      unknown
    >;
    const customDsl = (resume.customTheme ?? {}) as Record<string, unknown>;

    // Merge: base theme + custom overrides
    const mergedDsl = this.mergeDsl(baseDsl, customDsl);

    // Compile
    const ast = this.compiler.compileFromRaw(mergedDsl, target);

    return { ast, resumeId };
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
    const resume = await this.prisma.resume.findFirst({
      where: { slug, isPublic: true },
      include: { activeTheme: true },
    });

    if (!resume) {
      throw new BadRequestException('Resume not found or not public');
    }

    const baseDsl = (resume.activeTheme?.styleConfig ?? {}) as Record<
      string,
      unknown
    >;
    const customDsl = (resume.customTheme ?? {}) as Record<string, unknown>;
    const mergedDsl = this.mergeDsl(baseDsl, customDsl);

    const ast = this.compiler.compileFromRaw(mergedDsl, target);

    return { ast, slug };
  }

  /**
   * Deep merge two DSL objects
   */
  private mergeDsl(
    base: Record<string, unknown>,
    overrides: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...base };

    for (const key of Object.keys(overrides)) {
      const baseValue = base[key];
      const overrideValue = overrides[key];

      if (
        typeof baseValue === 'object' &&
        baseValue !== null &&
        typeof overrideValue === 'object' &&
        overrideValue !== null &&
        !Array.isArray(baseValue) &&
        !Array.isArray(overrideValue)
      ) {
        result[key] = this.mergeDsl(
          baseValue as Record<string, unknown>,
          overrideValue as Record<string, unknown>,
        );
      } else if (overrideValue !== undefined) {
        result[key] = overrideValue;
      }
    }

    return result;
  }
}
