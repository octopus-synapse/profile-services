/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

/** F5.I.3 SKIP — same SDU surface as `UnknownScreenException`. */
export class UnknownEventException extends ValidationException {
  readonly code: string = 'UNKNOWN_EVENT';
  constructor(eventName: string) {
    super(`Event "${eventName}" is not registered`);
  }
}
