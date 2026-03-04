/**
 * Forbidden Exception
 *
 * Thrown when user lacks permission for an operation.
 * Maps to HTTP 403.
 */
import { DomainException } from './domain.exception';

export class ForbiddenException extends DomainException {
  readonly code = 'FORBIDDEN';
  readonly statusHint = 403;

  constructor(message: string = 'Access denied') {
    super(message);
  }
}
