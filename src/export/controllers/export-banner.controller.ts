/**
 * Export Banner Controller
 * Handles LinkedIn banner export
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
import { BannerCaptureService } from '../services/banner-capture.service';
import { AppLoggerService } from '../../common/logger/logger.service';

@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('export')
export class ExportBannerController {
  constructor(
    private readonly bannerCaptureService: BannerCaptureService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ExportBannerController.name);
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
}
