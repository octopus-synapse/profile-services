/**
 * Export Banner Controller
 * Handles LinkedIn banner export
 */

import {
  Controller,
  Get,
  Header,
  InternalServerErrorException,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiStreamResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { BannerCaptureService } from '../adapters/external-services/banner-capture.service';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportBannerController {
  constructor(
    private readonly bannerCaptureService: BannerCaptureService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ExportBannerController.name);
  }

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('banner')
  @Header('Content-Type', 'image/png')
  @Header('Content-Disposition', 'attachment; filename="linkedin-banner.png"')
  @ApiOperation({ summary: 'Export LinkedIn banner image' })
  @ApiStreamResponse({ mimeType: 'image/png', description: 'PNG image file' })
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
      throw new InternalServerErrorException('Failed to generate banner. Please try again later.');
    }
  }
}
