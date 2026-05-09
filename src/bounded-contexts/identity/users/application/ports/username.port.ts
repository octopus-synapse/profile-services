/**
 * Username Repository Port.
 *
 * Per-UC ports (UpdateUsernameUseCasePort, CheckUsernameAvailabilityUseCasePort,
 * ValidateUsernameUseCasePort) live in their own files alongside this
 * one — see ADR-002.
 */

export abstract class UsernameRepositoryPort {
  abstract findUserById(userId: string): Promise<{ id: string; username: string | null } | null>;

  abstract updateUsername(userId: string, username: string): Promise<{ username: string }>;

  abstract findLastUsernameUpdateByUserId(userId: string): Promise<Date | null>;

  abstract isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean>;
}

export type {
  UsernameAvailability,
  UsernameUnavailableReason,
} from './check-username-availability.use-case.port';
// Re-exports kept for downstream importers that consumed types from this
// barrel — the canonical homes are the per-UC port files.
export type { UpdatedUsername } from './update-username.use-case.port';
export type { UsernameValidationResult } from './validate-username.use-case.port';
