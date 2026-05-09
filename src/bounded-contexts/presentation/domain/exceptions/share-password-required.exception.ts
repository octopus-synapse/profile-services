/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { ForbiddenException } from '@/shared-kernel/exceptions';

export class SharePasswordRequiredException extends ForbiddenException {
  override readonly code: string = 'SHARE_PASSWORD_REQUIRED';
  constructor() {
    super('Password required');
  }
}
