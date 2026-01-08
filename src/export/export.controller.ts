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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BannerCaptureService } from './services/banner-capture.service';
import { ResumePDFService } from './services/resume-pdf.service';
import { ResumeDOCXService } from './services/resume-docx.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/auth-request.interface';
import { AppLoggerService } from '../common/logger/logger.service';

@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportController {
  constructor(
    private readonly bannerCaptureService: BannerCaptureService,
    private readonly resumePDFService: ResumePDFService,
    private readonly resumeDOCXService: ResumeDOCXService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ExportController.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('banner')
  @Header('Content-Type', 'image/png')
  @Header('Content-Disposition', 'attachment; filename="linkedin-banner.png"')
  @ApiOperation({ summary: 'Export LinkedIn banner image' })
  @ApiProduces('image/png')
  @ApiQuery({
    name: 'palette',
    required: false,
    description: 'Color palette name',
  })
  @ApiQuery({
    name: 'logo',
    required: false,
    description: 'Logo URL to include in banner',
  })
  @ApiResponse({ status: 200, description: 'PNG image file' })
  @ApiResponse({ status: 400, description: 'Failed to generate banner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportBanner(
    @Query('palette') palette?: string,
    @Query('logo') logoUrl?: string,
  ): Promise<StreamableFile> {
    try {
      const buffer = await this.bannerCaptureService.capture(palette, logoUrl);
      return new StreamableFile(buffer);
    } catch (error) {
      this.logger.errorWithMeta('Failed to generate banner', {
        palette,
        logoUrl,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException(
        'Failed to generate banner. Please try again later.',
      );
    }
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

  @UseGuards(JwtAuthGuard)
  @Get('resume/docx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @Header('Content-Disposition', 'attachment; filename="resume.docx"')
  @ApiOperation({ summary: 'Export resume as DOCX document' })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @ApiResponse({ status: 200, description: 'DOCX document file' })
  @ApiResponse({ status: 400, description: 'Failed to generate DOCX' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportResumeDOCX(
    @CurrentUser() user: UserPayload,
  ): Promise<StreamableFile> {
    try {
      const buffer = await this.resumeDOCXService.generate(user.userId);
      return new StreamableFile(buffer);
    } catch (error) {
      this.logger.errorWithMeta('Failed to generate DOCX', {
        userId: user.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException(
        'Failed to generate DOCX. Please try again later.',
      );
    }
  }
}
