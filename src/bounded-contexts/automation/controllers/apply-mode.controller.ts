import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ApplyModeService, type WeeklyCuratedBatchView } from '../services/apply-mode.service';

class CurrentBatchDataDto {
  @ApiProperty({ nullable: true, description: "This week's batch or null if none active" })
  batch!: WeeklyCuratedBatchView | null;
}

class ApproveResultDto {
  @ApiProperty({ example: 'app_abc123' })
  applicationId!: string;

  @ApiProperty({ example: false })
  alreadyApplied!: boolean;
}

class RejectResultDto {
  @ApiProperty({ example: 'item_abc123' })
  itemId!: string;
}

@SdkExport({ tag: 'apply-mode', description: 'Weekly curated approval flow' })
@ApiTags('apply-mode')
@ApiBearerAuth('JWT-auth')
@Controller('v1/apply-mode')
@UseGuards(JwtAuthGuard)
export class ApplyModeController {
  constructor(private readonly service: ApplyModeService) {}

  @Get('weekly-curated/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "This week's curated batch for the viewer." })
  @ApiDataResponse(CurrentBatchDataDto, { description: "This week's curated batch" })
  async current(@Req() req: AuthenticatedRequest): Promise<DataResponse<CurrentBatchDataDto>> {
    const batch = await this.service.getCurrentBatch(req.user.userId);
    return { success: true, data: { batch } };
  }

  @Post('weekly-curated/:itemId/approve')
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
    const result = await this.service.approve(req.user.userId, itemId);
    return { success: true, data: result };
  }

  @Post('weekly-curated/:itemId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a curated item.' })
  @ApiParam({ name: 'itemId', type: 'string' })
  @ApiDataResponse(RejectResultDto, { description: 'Item marked as rejected' })
  async reject(
    @Param('itemId') itemId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<RejectResultDto>> {
    await this.service.reject(req.user.userId, itemId);
    return { success: true, data: { itemId } };
  }
}
