/**
 * Per-UC port for `ValidateUsernameUseCase`.
 *
 * Returns a multi-error result intended for client-side form display: the
 * UI shows every problem at once (e.g. "too short" + "reserved" together)
 * instead of revealing them one keystroke at a time.
 *
 * The use case returns `errors: DomainCode[]` (i18n primitive from
 * `shared-kernel/i18n`). The route handler localizes each entry against
 * the request's `Accept-Language` and returns the enriched
 * `UsernameValidationError[]` to the client. See Q8b in CLAUDE.md.
 */

import type { DomainCode } from '@/shared-kernel/i18n/domain-code';

export interface UsernameValidationResult {
  readonly username: string;
  readonly valid: boolean;
  readonly available?: boolean;
  readonly errors: readonly DomainCode[];
}

export abstract class ValidateUsernameUseCasePort {
  abstract execute(username: string, requesterUserId?: string): Promise<UsernameValidationResult>;
}
