/**
 * Export PDF Controller
 * Handles PDF resume export
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  StreamableFile,
  Header,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResumePDFService } from '../services/resume-pdf.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../../auth/interfaces/auth-request.interface';
import { AppLoggerService } from '../../common/logger/logger.service';

@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportPdfController {
  constructor(
    private readonly resumePDFService: ResumePDFService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ExportPdfController.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('resume/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="resume.pdf"')
  @ApiOperation({ summary: 'Export resume as PDF document' })
  @ApiProduces('application/pdf')
  @ApiQuery({
    name: 'palette',
    required: false,
    description: 'Color palette name for styling',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (e.g., en, pt)',
  })
  @ApiQuery({
    name: 'bannerColor',
    required: false,
    description: 'Custom banner color (hex)',
  })
  @ApiResponse({ status: 200, description: 'PDF document file' })
  @ApiResponse({ status: 400, description: 'Failed to generate PDF' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportResumePDF(
    @CurrentUser() user: UserPayload,
    @Query('palette') palette?: string,
    @Query('lang') lang?: string,
    @Query('bannerColor') bannerColor?: string,
  ): Promise<StreamableFile> {
    try {
      const buffer = await this.resumePDFService.generate({
        palette,
        lang,
        bannerColor,
        userId: user.userId,
      });
      return new StreamableFile(buffer);
    } catch (error) {
      this.logger.errorWithMeta('Failed to generate PDF', {
        userId: user.userId,
        palette,
        lang,
        bannerColor,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException(
        'Failed to generate PDF. Please try again later.',
      );
    }
  }
}
