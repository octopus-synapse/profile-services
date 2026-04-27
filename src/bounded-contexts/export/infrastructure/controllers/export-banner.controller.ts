/**
 * Export Banner Controller
 * Handles LinkedIn banner export. Banner runs anonymously (no userId), so
 * `pipeline.runBanner` only translates capture failures into the domain
 * exception — no event lifecycle.
 */

import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiStreamResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ExportPipelineService } from '../../application/services/export-pipeline.service';
import { BannerCaptureService } from '../adapters/external-services/banner-capture.service';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportBannerController {
  constructor(
    private readonly bannerCaptureService: BannerCaptureService,
    private readonly pipeline: ExportPipelineService,
  ) {}

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('banner')
  @Header('Content-Type', 'image/png')
  @Header('Content-Disposition', 'attachment; filename="linkedin-banner.png"')
  @ApiOperation({ summary: 'Export LinkedIn banner image' })
  @ApiStreamResponse({ mimeType: 'image/png', description: 'PNG image file' })
  @ApiProduces('image/png')
  @ApiQuery({ name: 'palette', required: false, description: 'Color palette name' })
  @ApiQuery({ name: 'logo', required: false, description: 'Logo URL to include in banner' })
  async exportBanner(
    @Query('palette') palette?: string,
    @Query('logo') logoUrl?: string,
  ): Promise<StreamableFile> {
    const buffer = await this.pipeline.runBanner(() =>
      this.bannerCaptureService.capture(palette, logoUrl),
    );
    return new StreamableFile(buffer);
  }
}
