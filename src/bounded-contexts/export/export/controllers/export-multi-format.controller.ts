import { Controller, Get, HttpStatus, Param, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { ExportResultDto } from '@/shared-kernel';
import { ResumeJsonService } from '../services/resume-json.service';
import { ResumeLatexService } from '../services/resume-latex.service';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/export')
export class ExportMultiFormatController {
  constructor(
    private readonly resumeJsonService: ResumeJsonService,
    private readonly resumeLatexService: ResumeLatexService,
  ) {}

  @Get(':resumeId/json')
  @ApiOperation({ summary: 'Export resume as JSON' })
  @ApiResponse({ status: 200, type: ExportResultDto })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['jsonresume', 'profile'],
    description: 'JSON format (default: jsonresume)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'JSON resume data',
  })
  async exportJson(
    @Param('resumeId') resumeId: string,
    @Query('format') format?: 'jsonresume' | 'profile',
    @Res() res?: Response,
  ): Promise<void> {
    const json = await this.resumeJsonService.exportAsJson(resumeId, {
      format: format ?? 'jsonresume',
    });

    if (res) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="resume-${resumeId}.json"`);
      res.send(json);
    }
  }

  @Get(':resumeId/latex')
  @ApiOperation({ summary: 'Export resume as LaTeX' })
  @ApiResponse({ status: 200, type: ExportResultDto })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({
    name: 'template',
    required: false,
    enum: ['simple', 'moderncv'],
    description: 'LaTeX template (default: simple)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'LaTeX source file',
  })
  async exportLatex(
    @Param('resumeId') resumeId: string,
    @Query('template') template?: 'simple' | 'moderncv',
    @Res() res?: Response,
  ): Promise<void> {
    const latex = await this.resumeLatexService.exportAsLatex(resumeId, {
      template: template ?? 'simple',
    });

    if (res) {
      res.setHeader('Content-Type', 'application/x-latex');
      res.setHeader('Content-Disposition', `attachment; filename="resume-${resumeId}.tex"`);
      res.send(latex);
    }
  }
}
