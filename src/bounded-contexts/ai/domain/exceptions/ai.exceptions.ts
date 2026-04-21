/**
 * AI Bounded Context Exceptions
 *
 * Covers LLM adapter failures. Most of these are infra-internal and surface
 * to the user as a generic "AI_UNAVAILABLE" or "AI_INVALID_OUTPUT" so we
 * never leak provider names or prompt text in the response envelope.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class AiNotConfiguredException extends DomainException {
  readonly code: string = 'AI_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor() {
    super('AI features are not configured on this instance.');
  }
}

export class AiEmptyInputException extends DomainException {
  readonly code: string = 'AI_EMPTY_INPUT';
  readonly statusHint = 400;
  constructor(operation: string) {
    super(`${operation} called with empty input`);
  }
}

export class AiEmptyResponseException extends DomainException {
  readonly code: string = 'AI_EMPTY_RESPONSE';
  readonly statusHint = 502;
  constructor(operation: string) {
    super(`AI returned an empty response for ${operation}`);
  }
}

export class AiInvalidOutputException extends DomainException {
  readonly code: string = 'AI_INVALID_OUTPUT';
  readonly statusHint = 502;
  constructor(operation: string) {
    super(`AI output shape is invalid for ${operation}`);
  }
}
