/**
 * Per-UC port for `CheckUsernameAvailabilityUseCase`.
 *
 * The result is the binary "is this name claimable" plus the structured
 * reason for non-availability so the UI can render a tailored hint
 * without re-running the format check client-side.
 */

export type UsernameUnavailableReason = 'taken' | 'reserved' | 'invalid_format';

export interface UsernameAvailability {
  readonly username: string;
  readonly available: boolean;
  readonly reason?: UsernameUnavailableReason;
}

export abstract class CheckUsernameAvailabilityUseCasePort {
  abstract execute(username: string, requesterUserId?: string): Promise<UsernameAvailability>;
}
