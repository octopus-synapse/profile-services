import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { TrackPlatformEventsUseCase } from '../../application/use-cases/track-platform-events/track-platform-events.use-case';
import { TrackEventsBodyDto, TrackEventsDataDto } from '../../dto/track-event.dto';

@SdkExport({
  tag: 'platform-events',
  description: 'Frontend product analytics ingestion',
  requiresAuth: true,
})
@ApiTags('Platform Events')
@ApiBearerAuth()
@Controller('v1/events')
export class PlatformEventsController {
  constructor(private readonly trackEvents: TrackPlatformEventsUseCase) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ingest a batch of product events',
    description:
      'Accepts up to 100 events per request. Events are stored as-is; props is free-form JSON.',
  })
  @ApiDataResponse(TrackEventsDataDto, { description: 'Events accepted' })
  async track(
    @Req() req: { user?: { userId: string } },
    @Body() body: TrackEventsBodyDto,
  ): Promise<{ accepted: number }> {
    return this.trackEvents.execute(req.user?.userId ?? null, body);
  }
}
