import { Controller, Get, MessageEvent, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { FeatureFlagService } from '../application/services/feature-flag.service';
import { FeatureFlagEvaluationDto } from '../dto/feature-flag.dto';
import { SseFlagStream } from '../infrastructure/sse/sse-flag-stream.service';

@SdkExport({ tag: 'feature-flags', description: 'Feature Flags API', requiresAuth: true })
@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('v1/feature-flags')
export class FeatureFlagsController {
  constructor(
    private readonly service: FeatureFlagService,
    private readonly stream: SseFlagStream,
  ) {}

  @Get('evaluate')
  @ApiOperation({
    summary: 'Evaluate effective flag state for the current user',
    description:
      'Returns a map of flag key → boolean. The boolean is the *effective* value: a flag is true only if its own enabled state, every ancestor, and the role restriction all allow it.',
  })
  @ApiDataResponse(FeatureFlagEvaluationDto, { description: 'User-scoped flag snapshot' })
  async evaluate(@CurrentUser() user: UserPayload): Promise<FeatureFlagEvaluationDto> {
    const flags = await this.service.snapshotFor(user.userId);
    return { flags };
  }

  @Sse('stream')
  @ApiOperation({
    summary: 'Subscribe to flag invalidation broadcasts',
    description:
      'Server-Sent Events channel emitting `invalidate` messages when admin toggles a flag or triggers a broadcast refresh. Clients should re-fetch /evaluate on each message.',
  })
  subscribe(): Observable<MessageEvent> {
    return this.stream.observe();
  }
}
