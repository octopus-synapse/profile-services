/**
 * Validates a DSL payload against the Zod schema. Pure validation —
 * no persistence, no compilation. Returns the canonical envelope used
 * by the validate endpoint and the live editor.
 */

import type { DslValidatorService } from '../../services/dsl-validator.service';

export interface ValidateDslResult {
  valid: boolean;
  errors: string[] | null;
}

export class ValidateDslUseCase {
  constructor(private readonly validator: DslValidatorService) {}

  execute(body: unknown): ValidateDslResult {
    const result = this.validator.validate(body);
    return { valid: result.valid, errors: result.errors ?? null };
  }
}
