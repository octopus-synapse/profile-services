/**
 * User Admin Service (Facade)
 * Provides unified API for admin user management
 * Delegates to specialized services for implementation
 */

import { Injectable } from '@nestjs/common';
import { UserAdminQueryService } from './user-admin-query.service';
import type { GetAllUsersOptions } from './user-admin-query.service';
import { UserAdminMutationService } from './user-admin-mutation.service';
import type {
  AdminCreateUser,
  AdminUpdateUser,
  AdminResetPassword,
} from '@octopus-synapse/profile-contracts';

// Re-export for backward compatibility
export type { GetAllUsersOptions };

@Injectable()
export class UserAdminService {
  constructor(
    private readonly queryService: UserAdminQueryService,
    private readonly mutationService: UserAdminMutationService,
  ) {}

  // ==================== Query Operations ====================

  async findAllUsersWithPagination(queryOptions: GetAllUsersOptions) {
    return this.queryService.findAllUsersWithPagination(queryOptions);
  }

  async findUserByIdWithDetails(userId: string) {
    return this.queryService.findUserByIdWithDetails(userId);
  }

  // ==================== Mutation Operations ====================

  async createUserAccount(createUserData: AdminCreateUser) {
    return this.mutationService.createUserAccount(createUserData);
  }

  async updateUserAccount(userId: string, updateUserData: AdminUpdateUser) {
    return this.mutationService.updateUserAccount(userId, updateUserData);
  }

  async deleteUserAccount(userId: string) {
    return this.mutationService.deleteUserAccount(userId);
  }

  async resetUserPassword(
    userId: string,
    resetPasswordData: AdminResetPassword,
  ) {
    return this.mutationService.resetUserPassword(userId, resetPasswordData);
  }
}
