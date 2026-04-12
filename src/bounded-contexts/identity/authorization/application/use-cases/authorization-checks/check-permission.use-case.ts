/**
 * Check Permission Use Case
 *
 * Checks if a user has a specific permission on a resource.
 */

import type { UserId } from '../../../domain/entities/user-auth-context.entity';
import type { GetAuthContextUseCase } from './get-auth-context.use-case';

export class CheckPermissionUseCase {
  constructor(private readonly getAuthContext: GetAuthContextUseCase) {}

  async execute(userId: UserId, resource: string, action: string): Promise<boolean> {
    const context = await this.getAuthContext.execute(userId);
    return context.hasPermission(resource, action);
  }
}
