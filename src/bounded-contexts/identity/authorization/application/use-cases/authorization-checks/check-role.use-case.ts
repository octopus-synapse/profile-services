/**
 * Check Role Use Case
 *
 * Checks if a user has a specific role (by ID or name).
 */

import type { UserId } from '../../../domain/entities/user-auth-context.entity';
import type { IRoleRepository } from '../../../domain/ports/authorization-repositories.port';
import type { GetAuthContextUseCase } from './get-auth-context.use-case';

export class CheckRoleUseCase {
  constructor(
    private readonly getAuthContext: GetAuthContextUseCase,
    private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(userId: UserId, roleIdOrName: string): Promise<boolean> {
    const context = await this.getAuthContext.execute(userId);

    // Check by ID first
    if (context.hasRole(roleIdOrName)) {
      return true;
    }

    // Check by name
    const role = await this.roleRepo.findByName(roleIdOrName);
    if (role) {
      return context.hasRole(role.id);
    }

    return false;
  }
}
