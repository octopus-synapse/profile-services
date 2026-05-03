/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { ForbiddenException } from '@/shared-kernel/exceptions';

export class OnlyAdminsCanDoThisException extends ForbiddenException {
  readonly code: string = 'ONLY_ADMINS_CAN_DO_THIS';
  constructor() {
    super('Only admins can perform this action');
  }
}
