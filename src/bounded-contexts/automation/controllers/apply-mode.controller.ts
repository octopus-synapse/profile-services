import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ApplyModeService, type WeeklyCuratedBatchView } from '../services/apply-mode.service';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
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
  async current(
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<{ batch: WeeklyCuratedBatchView | null }>> {
    const batch = await this.service.getCurrentBatch(req.user.userId);
    return { success: true, data: { batch } };
  }

  @Post('weekly-curated/:itemId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Approve a curated item — submits a JobApplication using the user's primary resume.",
  })
  @ApiParam({ name: 'itemId', type: 'string' })
  async approve(
    @Param('itemId') itemId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<{ applicationId: string; alreadyApplied: boolean }>> {
    const result = await this.service.approve(req.user.userId, itemId);
    return { success: true, data: result };
  }

  @Post('weekly-curated/:itemId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a curated item.' })
  @ApiParam({ name: 'itemId', type: 'string' })
  async reject(
    @Param('itemId') itemId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<{ itemId: string }>> {
    await this.service.reject(req.user.userId, itemId);
    return { success: true, data: { itemId } };
  }
}
