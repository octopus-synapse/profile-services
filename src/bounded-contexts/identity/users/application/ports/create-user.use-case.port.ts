/**
 * Per-UC port for `CreateUserUseCase` (admin endpoint).
 */

import type { CreatedUser, CreateUserData } from './user-management.port';

export abstract class CreateUserUseCasePort {
  abstract execute(data: CreateUserData): Promise<CreatedUser>;
}
