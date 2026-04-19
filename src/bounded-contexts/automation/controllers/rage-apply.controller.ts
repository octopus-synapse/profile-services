import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { RageApplyService } from '../services/rage-apply.service';

interface RageApplyBody {
  minFit?: number;
  maxApplications?: number;
  sinceDays?: number;
}

@SdkExport({ tag: 'automation', description: 'Batch apply API' })
@ApiTags('automation')
@ApiBearerAuth('JWT-auth')
@Controller('v1/automation/rage-apply')
export class RageApplyController {
  constructor(private readonly service: RageApplyService) {}

  @Post()
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Submit tailored applications to every open job that matches minFit. Bounded by maxApplications (default 20, cap 100).',
  })
  async run(
    @CurrentUser() user: UserPayload,
    @Body() body: RageApplyBody = {},
  ): Promise<{ success: true; data: unknown }> {
    const since =
      typeof body.sinceDays === 'number'
        ? new Date(Date.now() - body.sinceDays * 24 * 60 * 60 * 1000)
        : undefined;

    const result = await this.service.execute({
      userId: user.userId,
      minFit: body.minFit,
      maxApplications: body.maxApplications,
      since,
    });

    return { success: true, data: result };
  }
}
