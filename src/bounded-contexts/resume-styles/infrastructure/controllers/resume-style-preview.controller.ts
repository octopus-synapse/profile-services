import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ResumeStylesUseCases } from '../../application/ports/resume-styles.port';

/**
 * Edge-case controller for the binary preview endpoint. The renderer
 * writes raw bytes to the Express `Response`, which the
 * Route-descriptor pipeline doesn't yet model — keep this slim
 * controller until the synthesizer learns about `kind: 'stream'`.
 */
@ApiTags('resume-styles')
@Controller()
@UseGuards(JwtAuthGuard)
export class ResumeStylePreviewController {
  constructor(private readonly bc: ResumeStylesUseCases) {}

  @Get('v1/resume-styles/:id/preview.pdf')
  @ApiOperation({ summary: 'Render a generic preview PDF for the style' })
  @ApiParam({ name: 'id', type: 'string' })
  async preview(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const buffer = await this.bc.previewStyle.execute(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="style-${id}-preview.pdf"`);
    res.end(buffer);
  }
}
