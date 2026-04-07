/**
 * Count Users With Role Use Case
 *
 * Counts users with a specific role by name.
 */

import type { IUserAuthorizationRepository } from '../../../domain/ports/authorization-repositories.port';

export interface CountUsersWithRoleRepository
  extends Pick<IUserAuthorizationRepository, never> {
  countUsersWithRoleName(roleName: string): Promise<number>;
}

export class CountUsersWithRoleUseCase {
  constructor(private readonly userAuthRepo: CountUsersWithRoleRepository) {}

  async execute(roleName: string): Promise<number> {
    return this.userAuthRepo.countUsersWithRoleName(roleName);
  }
}
