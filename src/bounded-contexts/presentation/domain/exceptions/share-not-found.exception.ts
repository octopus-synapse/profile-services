/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ShareNotFoundException extends DomainException {
  readonly code: string = 'SHARE_NOT_FOUND';
  readonly statusHint = 404;
  constructor() {
    super('Share not found');
  }
}
