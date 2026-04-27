/**
 * Composite endpoint that returns everything the dashboard page needs in
 * one round-trip. Serves as a template for other "page" endpoints — the
 * pattern collapses N parallel client-side fetches + merging logic into
 * a single typed payload the frontend can render directly.
 */

import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { UiMetadataUseCases } from '../../application/ports/ui-metadata.port';
import type { MeDashboardPayload } from '../../domain/entities/me-dashboard';

@SdkExport({ tag: 'pages', description: 'Composite page payloads' })
@ApiTags('pages')
@ApiBearerAuth('JWT-auth')
@Controller('v1/pages/me-dashboard')
export class MeDashboardController {
  constructor(private readonly bc: UiMetadataUseCases) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Single payload for the dashboard: counts (resumes, applications, unread notifications), latest activity items, viewer summary. Replaces ~5 parallel UI fetches.',
  })
  async load(
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: true; data: MeDashboardPayload }> {
    const data = await this.bc.loadMeDashboard.execute(user.userId);
    return { success: true, data };
  }
}
