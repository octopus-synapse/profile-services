/**
 * Username Port
 *
 * Defines domain types and repository abstraction for username operations.
 */

// ============================================================================
// Domain Types
// ============================================================================

export type UpdatedUsername = {
  username: string;
};

export type UsernameAvailability = {
  username: string;
  available: boolean;
};

export type UsernameValidationError = {
  code: string;
  message: string;
};

export type UsernameValidationResult = {
  username: string;
  valid: boolean;
  available?: boolean;
  errors: UsernameValidationError[];
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class UsernameRepositoryPort {
  abstract findUserById(userId: string): Promise<{ id: string; username: string | null } | null>;

  abstract updateUsername(userId: string, username: string): Promise<{ username: string }>;

  abstract findLastUsernameUpdateByUserId(userId: string): Promise<Date | null>;

  abstract isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const USERNAME_USE_CASES = Symbol('USERNAME_USE_CASES');

export interface UsernameUseCases {
  updateUsernameUseCase: {
    execute: (userId: string, username: string) => Promise<UpdatedUsername>;
  };
}
