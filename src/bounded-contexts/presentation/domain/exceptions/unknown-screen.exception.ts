/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { DomainException } from '@/shared-kernel/exceptions';

/**
 * F5.I.3 SKIP — Server-Driven UI infrastructure (`screen registry` /
 * `event tracking catalogue` / `screen renderer`) is not yet wired in
 * the codebase. Once the SDU bootstrap lands the throws will live in
 * the screen-registry / event-registry / screen-renderer composition.
 */
export class UnknownScreenException extends DomainException {
  readonly code: string = 'UNKNOWN_SCREEN';
  readonly statusHint = 404;
  constructor(screenId: string) {
    super(`Screen "${screenId}" is not registered`);
  }
}
