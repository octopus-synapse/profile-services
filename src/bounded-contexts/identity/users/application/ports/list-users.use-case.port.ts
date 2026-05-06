/**
 * Per-UC port for `ListUsersUseCase` (admin endpoint).
 */

import type { UserListOptions, UserListResult } from './user-management.port';

export abstract class ListUsersUseCasePort {
  abstract execute(options: UserListOptions): Promise<UserListResult>;
}
