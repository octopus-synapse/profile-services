/**
 * Username Repository Port
 *
 * Defines the abstraction for username-related operations.
 */

export abstract class UsernameRepositoryPort {
  abstract findUserById(userId: string): Promise<{ id: string; username: string | null } | null>;

  abstract updateUsername(userId: string, username: string): Promise<{ username: string }>;

  abstract findLastUsernameUpdateByUserId(userId: string): Promise<Date | null>;

  abstract isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean>;
}
