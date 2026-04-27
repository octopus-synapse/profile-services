/**
 * Legacy controller — keeps only the `approve` endpoint that uses
 * custom guards (`RequireFitProfileGuard`, `RequireMinQualityGuard`)
 * which the Route synthesizer cannot yet model. The `current` and
 * `reject` endpoints moved to `automation.routes.ts`.
 */
import { Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { RequireFitProfileGuard } from '@/bounded-contexts/fit-profile/infrastructure/guards/require-fit-profile.guard';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  RequireMinQuality,
  RequireMinQualityGuard,
} from '@/bounded-contexts/resume-quality/infrastructure/guards/require-min-quality.guard';
import { AutomationUseCases } from '../../application/ports/automation.port';

class ApproveResultDto {
  @ApiProperty({ example: 'app_abc123' })
  applicationId!: string;

  @ApiProperty({ example: false })
  alreadyApplied!: boolean;
}

@SdkExport({ tag: 'apply-mode', description: 'Weekly curated approval flow' })
@ApiTags('apply-mode')
@ApiBearerAuth('JWT-auth')
@Controller('v1/apply-mode')
@UseGuards(JwtAuthGuard)
export class ApplyModeController {
  constructor(private readonly bc: AutomationUseCases) {}

  @Post('weekly-curated/:itemId/approve')
  @UseGuards(RequireFitProfileGuard, RequireMinQualityGuard)
  @RequireMinQuality()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Approve a curated item — submits a JobApplication using the user's primary resume.",
  })
  @ApiParam({ name: 'itemId', type: 'string' })
  @ApiDataResponse(ApproveResultDto, { description: 'Application created or already existed' })
  async approve(
    @Param('itemId') itemId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<ApproveResultDto>> {
    const result = await this.bc.approveCuratedItem.execute(req.user.userId, itemId);
    return { success: true, data: result };
  }
}
