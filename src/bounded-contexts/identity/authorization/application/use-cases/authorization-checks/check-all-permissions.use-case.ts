/**
 * Check All Permissions Use Case
 *
 * Checks if a user has all of the specified permissions.
 */

import type { UserId } from '../../../domain/entities/user-auth-context.entity';
import type { GetAuthContextUseCase } from './get-auth-context.use-case';

export class CheckAllPermissionsUseCase {
  constructor(private readonly getAuthContext: GetAuthContextUseCase) {}

  async execute(
    userId: UserId,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean> {
    const context = await this.getAuthContext.execute(userId);
    return context.hasAllPermissions(permissions);
  }
}
