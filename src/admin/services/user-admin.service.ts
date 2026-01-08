/**
 * User Admin Service (Facade)
 * Provides unified API for admin user management
 * Delegates to specialized services for implementation
 */

import { Injectable } from '@nestjs/common';
import { UserAdminQueryService } from './user-admin-query.service';
import type { GetAllUsersOptions } from './user-admin-query.service';
import { UserAdminMutationService } from './user-admin-mutation.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AdminResetPasswordDto } from '../dto/reset-password.dto';

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

  async create(dto: CreateUserDto) {
    return this.mutationService.create(dto);
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.mutationService.update(id, dto);
  }

  async delete(id: string) {
    return this.mutationService.delete(id);
  }

  async resetPassword(id: string, dto: AdminResetPasswordDto) {
    return this.mutationService.resetPassword(id, dto);
  }
}
