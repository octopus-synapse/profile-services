/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class UrlRequiredException extends ValidationException {
  readonly code: string = 'URL_REQUIRED';
  constructor() {
    super('A non-empty URL is required');
  }
}
