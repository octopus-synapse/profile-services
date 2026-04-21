/**
 * ATS Scoring Bounded Context Exceptions
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class InvalidAtsScoreException extends ValidationException {
  readonly code: string = 'ATS_SCORE_OUT_OF_RANGE';
  constructor(value: number) {
    super(`ATS score must be 0-100 (got ${value})`);
  }
}
