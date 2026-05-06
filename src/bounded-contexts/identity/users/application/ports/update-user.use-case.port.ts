/**
 * Per-UC port for `UpdateUserUseCase` (admin endpoint).
 */

import type { UpdatedUser, UpdateUserData } from './user-management.port';

export abstract class UpdateUserUseCasePort {
  abstract execute(userId: string, data: UpdateUserData): Promise<UpdatedUser>;
}
