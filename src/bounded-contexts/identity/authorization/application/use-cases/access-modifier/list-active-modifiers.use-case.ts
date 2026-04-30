/**
 * List Active Access Modifiers — read use case.
 *
 * Returns every modifier currently in effect for a user. The
 * permission gate calls this on the hot path; admins call it via the
 * `/api/v1/admin/users/:userId/access` endpoint to inspect state.
 */

import type { AccessModifier, UserId } from '../../../domain/entities/access-modifier.entity';
import type { IAccessModifierRepository } from '../../../domain/ports/access-modifier.port';

export class ListActiveModifiersUseCase {
  constructor(private readonly repository: IAccessModifierRepository) {}

  async execute(userId: UserId, at: Date = new Date()): Promise<AccessModifier[]> {
    return this.repository.findActiveForUser(userId, at);
  }
}
