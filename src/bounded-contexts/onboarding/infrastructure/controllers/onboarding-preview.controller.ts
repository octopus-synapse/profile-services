/**
 * Onboarding Preview SSE Controller
 *
 * Streams live PNG previews of the resume being built during onboarding.
 * Uses EventEmitter2 + debounce + versioning to avoid unnecessary renders.
 */

import { Controller, Logger, MessageEvent, Sse } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { debounceTime, filter, from, map, Observable, Subject, switchMap } from 'rxjs';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { PreviewRendererPort } from '../../domain/ports/preview-renderer.port';

@ApiTags('Onboarding Preview')
@ApiBearerAuth()
@Controller('v1/onboarding/preview')
export class OnboardingPreviewController {
  private readonly logger = new Logger(OnboardingPreviewController.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly renderer: PreviewRendererPort,
  ) {}

  @Sse('stream')
  @ApiOperation({
    summary: 'Subscribe to live resume preview updates',
    description: 'Streams PNG preview as base64 when onboarding data changes.',
  })
  streamPreview(@CurrentUser() user: UserPayload): Observable<MessageEvent> {
    const userId = user.userId;
    let version = 0;

    const trigger$ = new Subject<void>();

    const listener = (data: { userId: string }) => {
      if (data.userId === userId) {
        trigger$.next();
      }
    };

    this.eventEmitter.on('onboarding.data.changed', listener);

    return trigger$.pipe(
      debounceTime(500),
      switchMap(() => {
        version++;
        const currentVersion = version;
        return from(this.renderer.renderPreview(userId)).pipe(
          filter((buffer): buffer is Buffer => buffer !== null),
          map((buffer) => ({
            data: {
              type: 'preview',
              version: currentVersion,
              image: buffer.toString('base64'),
            },
            id: `preview-${currentVersion}`,
            type: 'preview',
            retry: 15000,
          })),
        );
      }),
    );
  }
}
