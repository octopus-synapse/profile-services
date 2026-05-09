/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { DomainException } from '@/shared-kernel/exceptions';

/** F5.I.3 SKIP — same SDU surface as `UnknownScreenException`. */
export class ScreenRenderFailedException extends DomainException {
  readonly code: string = 'SCREEN_RENDER_FAILED';
  readonly statusHint = 500;
  constructor(screenId: string, reason: string) {
    super(`Failed to render screen "${screenId}": ${reason}`);
  }
}
