/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

/**
 * QR / share-image generators require a target URL — empty input is a
 * validation error.
 */
export class QrUrlRequiredException extends ValidationException {
  override readonly code: string = 'QR_URL_REQUIRED';
  constructor() {
    super('A non-empty URL is required to generate the QR code');
  }
}
