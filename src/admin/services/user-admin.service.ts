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

  async getAll(options: GetAllUsersOptions) {
    return this.queryService.getAll(options);
  }

  async getById(id: string) {
    return this.queryService.getById(id);
  }

  // ==================== Mutation Operations ====================

  async create(dto: AdminCreateUser) {
    return this.mutationService.create(dto);
  }

  async update(id: string, dto: AdminUpdateUser) {
    return this.mutationService.update(id, dto);
  }

  async delete(id: string) {
    return this.mutationService.delete(id);
  }

  async resetPassword(id: string, dto: AdminResetPassword) {
    return this.mutationService.resetPassword(id, dto);
  }
}
