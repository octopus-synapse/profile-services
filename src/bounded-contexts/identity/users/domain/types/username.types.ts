/**
 * Username Domain Types
 *
 * Domain types for username operations.
 */

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

// Use Cases Interface Symbol
export const USERNAME_USE_CASES = Symbol('USERNAME_USE_CASES');

export interface UsernameUseCases {
  updateUsernameUseCase: {
    execute: (userId: string, username: string) => Promise<UpdatedUsername>;
  };
}
