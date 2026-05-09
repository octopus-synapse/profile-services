/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ShareAliasNotFoundException extends DomainException {
  readonly code: string = 'SHARE_ALIAS_NOT_FOUND';
  readonly statusHint = 404;
  constructor() {
    super('Alias not found');
  }
}
