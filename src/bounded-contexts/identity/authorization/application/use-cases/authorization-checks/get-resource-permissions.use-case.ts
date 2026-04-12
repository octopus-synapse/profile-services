/**
 * Get Resource Permissions Use Case
 *
 * Gets all permissions a user has for a specific resource.
 */

import type { UserId } from '../../../domain/entities/user-auth-context.entity';
import type { GetAuthContextUseCase } from './get-auth-context.use-case';

export class GetResourcePermissionsUseCase {
  constructor(private readonly getAuthContext: GetAuthContextUseCase) {}

  async execute(userId: UserId, resource: string): Promise<string[]> {
    const context = await this.getAuthContext.execute(userId);
    return context.getResourcePermissions(resource).map((p) => p.permission.action);
  }
}
