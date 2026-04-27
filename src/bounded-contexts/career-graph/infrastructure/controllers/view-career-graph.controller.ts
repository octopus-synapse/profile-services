import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { RateLimit, RateLimitGuard } from '@/bounded-contexts/platform/common/rate-limit';
import { CareerGraphUseCases, type ViewCareerGraphOutput } from '../../application';
import { ViewCareerGraphDataDto, ViewCareerGraphRequestDto } from './view-career-graph.dto';

/**
 * Thin HTTP boundary for `ViewCareerGraph`. POST because the request
 * carries a stack array — simpler than URL-encoding it.
 */

@SdkExport({ tag: 'career-graph', description: 'Career cohort projection API' })
@ApiTags('career-graph')
@ApiBearerAuth('JWT-auth')
@Controller('v1/career-graph')
@UseGuards(JwtAuthGuard)
export class ViewCareerGraphController {
  constructor(private readonly bc: CareerGraphUseCases) {}

  @Post('view')
  @UseGuards(RateLimitGuard)
  @RateLimit({ points: 30, duration: 3600, keyStrategy: 'user' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Aggregate opt-in peers who share ≥60% of the requested stack into experienceYears buckets; returns current bucket + 3/5/10y projections.',
  })
  @ApiBody({ type: ViewCareerGraphRequestDto })
  @ApiDataResponse(ViewCareerGraphDataDto, {
    description:
      'User snapshot + cohort buckets + forward projections. Never includes candidate identities.',
  })
  async view(
    @Body() body: ViewCareerGraphRequestDto,
    @Req() req: { user: { userId: string } },
  ): Promise<DataResponse<ViewCareerGraphOutput>> {
    const data = await this.bc.viewCareerGraph.execute({
      requesterId: req.user.userId,
      stack: body.stack,
      maxBuckets: body.maxBuckets,
    });
    return { success: true, data };
  }
}
