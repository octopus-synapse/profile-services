/**
 * Assert Email Verified Use Case
 *
 * Single source of truth for the "is the caller's email verified?"
 * predicate, factored out of the elysia pipeline so any application-layer
 * code (handlers, sagas, batch jobs) can short-circuit with a typed
 * `EmailNotVerifiedException` instead of building an ad-hoc error envelope.
 *
 * The pipeline-level check in `elysia-pipeline.ts` still exists for HTTP
 * routes — this use case lives in the BC so non-HTTP entrypoints (and
 * future refactors of that pipeline) have a stable, unit-testable API.
 */

import { EmailNotVerifiedException } from '../../../domain/exceptions';

export class AssertEmailVerifiedUseCase {
  execute(emailVerified: boolean | null | undefined): void {
    if (emailVerified !== true) {
      throw new EmailNotVerifiedException();
    }
  }
}
