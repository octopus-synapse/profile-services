/**
 * Check Group Membership Use Case
 *
 * Checks if a user belongs to a group (by ID or name).
 */

import type { UserId } from '../../../domain/entities/user-auth-context.entity';
import type { IGroupRepository } from '../../../domain/ports/authorization-repositories.port';
import type { GetAuthContextUseCase } from './get-auth-context.use-case';

export class CheckGroupMembershipUseCase {
  constructor(
    private readonly getAuthContext: GetAuthContextUseCase,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(userId: UserId, groupIdOrName: string): Promise<boolean> {
    const context = await this.getAuthContext.execute(userId);

    // Check by ID first
    if (context.inGroup(groupIdOrName)) {
      return true;
    }

    // Check by name
    const group = await this.groupRepo.findByName(groupIdOrName);
    if (group) {
      return context.inGroup(group.id);
    }

    return false;
  }
}
