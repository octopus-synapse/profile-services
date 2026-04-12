/**
 * Get All Permissions Use Case
 *
 * Gets all granted permission keys for a user.
 */

import type { UserId } from '../../../domain/entities/user-auth-context.entity';
import type { GetAuthContextUseCase } from './get-auth-context.use-case';

export class GetAllPermissionsUseCase {
  constructor(private readonly getAuthContext: GetAuthContextUseCase) {}

  async execute(userId: UserId): Promise<string[]> {
    const context = await this.getAuthContext.execute(userId);
    return context.grantedPermissionKeys;
  }
}
