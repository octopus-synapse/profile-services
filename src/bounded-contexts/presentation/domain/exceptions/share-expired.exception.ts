/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ShareExpiredException extends DomainException {
  readonly code: string = 'RESUME_SHARE_EXPIRED';
  readonly statusHint = 404;
  constructor() {
    super('Share link expired');
  }
}
