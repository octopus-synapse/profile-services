/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ShareLinkExpiredException extends DomainException {
  readonly code: string = 'SHARE_LINK_EXPIRED';
  readonly statusHint = 410;
  constructor(public readonly slug: string) {
    super(`Share link "${slug}" has expired`);
  }
}
