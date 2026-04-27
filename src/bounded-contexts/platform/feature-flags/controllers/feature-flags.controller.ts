/**
 * Legacy controller — keeps only the SSE endpoint that the Route
 * synthesizer cannot yet model. The plain `evaluate` endpoint moved to
 * `feature-flags.routes.ts`.
 */
import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { SseFlagStream } from '../infrastructure/sse/sse-flag-stream.service';

@SdkExport({ tag: 'feature-flags', description: 'Feature Flags API', requiresAuth: true })
@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('v1/feature-flags')
export class FeatureFlagsController {
  constructor(private readonly stream: SseFlagStream) {}

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
