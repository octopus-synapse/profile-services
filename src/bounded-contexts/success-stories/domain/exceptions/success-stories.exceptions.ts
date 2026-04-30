/**
 * Success Stories Bounded Context Exceptions
 *
 * Today the service only uses EntityNotFoundException from shared-kernel.
 * This file is a home for BC-specific rules as they emerge.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class SuccessStoryAlreadyPublishedException extends DomainException {
  readonly code: string = 'SUCCESS_STORY_ALREADY_PUBLISHED';
  readonly statusHint = 409;
  constructor(id: string) {
    super(`Success story ${id} is already published`);
  }
}
