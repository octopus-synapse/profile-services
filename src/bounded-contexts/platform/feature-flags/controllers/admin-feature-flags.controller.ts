import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { BroadcastRefreshUseCase } from '../application/use-cases/broadcast-refresh.use-case';
import { ImpactAnalysisUseCase } from '../application/use-cases/impact-analysis.use-case';
import { ListFlagsUseCase } from '../application/use-cases/list-flags.use-case';
import { ToggleFlagUseCase } from '../application/use-cases/toggle-flag.use-case';
import {
  FeatureFlagAdminListDto,
  FeatureFlagAdminRowDto,
  FeatureFlagImpactDto,
  ToggleFeatureFlagDto,
} from '../dto/feature-flag.dto';

@SdkExport({
  tag: 'admin-feature-flags',
  description: 'Admin Feature Flags API',
  requiresAuth: true,
})
@ApiTags('Admin - Feature Flags')
@ApiBearerAuth()
@Controller('v1/admin/feature-flags')
export class AdminFeatureFlagsController {
  constructor(
    private readonly list: ListFlagsUseCase,
    private readonly toggle: ToggleFlagUseCase,
    private readonly impact: ImpactAnalysisUseCase,
    private readonly broadcast: BroadcastRefreshUseCase,
  ) {}

  @Get()
  @RequirePermission(Permission.FEATURE_FLAG_READ)
  @ApiOperation({ summary: 'List all feature flags with metadata and blocking info' })
  @ApiDataResponse(FeatureFlagAdminListDto, { description: 'Full feature-flag registry state' })
  async listAll(): Promise<FeatureFlagAdminListDto> {
    const rows = await this.list.execute();
    return { flags: rows as FeatureFlagAdminRowDto[] };
  }

  @Get(':key/impact')
  @RequirePermission(Permission.FEATURE_FLAG_READ)
  @ApiOperation({
    summary: 'Preview transitive descendants affected when a flag is turned OFF',
  })
  @ApiDataResponse(FeatureFlagImpactDto, { description: 'Impact tree rooted at the given flag' })
  async getImpact(@Param('key') key: string): Promise<FeatureFlagImpactDto> {
    return { tree: await this.impact.execute(key) };
  }

  @Patch(':key')
  @RequirePermission(Permission.FEATURE_FLAG_MANAGE)
  @ApiOperation({
    summary: 'Toggle a flag or update its role restriction',
    description:
      'Turning ON is rejected with 409 when any ancestor is OFF. Deprecated flags are read-only.',
  })
  @ApiDataResponse(FeatureFlagAdminRowDto, { description: 'Updated flag row' })
  async updateFlag(
    @Param('key') key: string,
    @Body() body: ToggleFeatureFlagDto,
    @CurrentUser() user: UserPayload,
    @Req() request: Request,
  ): Promise<FeatureFlagAdminRowDto> {
    const record = await this.toggle.execute({
      key,
      enabled: body.enabled,
      enabledForRoles: body.enabledForRoles,
      actorId: user.userId,
      request,
    });
    // The list use-case recomputes blockedBy/effectiveGlobal; return the simpler
    // row here — the UI refetches the full list on mutation success anyway.
    return {
      ...record,
      blockedBy: [],
      effectiveGlobal: record.enabled,
    };
  }

  @Post('broadcast-refresh')
  @HttpCode(204)
  @RequirePermission(Permission.FEATURE_FLAG_MANAGE)
  @ApiOperation({
    summary: 'Invalidate all client flag snapshots',
    description:
      'Clears server-side caches and pushes an `invalidate` message through the SSE stream so every connected client refetches.',
  })
  @ApiEmptyDataResponse({ status: 204, description: 'Broadcast dispatched' })
  async broadcastRefresh(): Promise<void> {
    await this.broadcast.execute();
  }
}
