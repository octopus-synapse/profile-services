/**
 * User Management Service (Facade)
 *
 * Delegates to use cases following Clean Architecture.
 * Operations that require elevated permissions on user resources.
 *
 * Single Responsibility: Facade that delegates to specific use cases.
 */

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuthorizationServicePort } from '@/bounded-contexts/identity/authorization';
import type { AdminCreateUser, AdminResetPassword, AdminUpdateUser } from '@/shared-kernel';
import {
  type CreatedUser,
  type UpdatedUser,
  USER_MANAGEMENT_USE_CASES,
  type UserDetails,
  type UserListOptions,
  type UserListResult,
  type UserManagementUseCases,
} from './user-management/ports/user-management.port';

@Injectable()
export class UserManagementService {
  constructor(
    @Inject(USER_MANAGEMENT_USE_CASES)
    private readonly useCases: UserManagementUseCases,
    private readonly authService: AuthorizationServicePort,
  ) {}

  /**
   * List users with pagination
   * @returns UserListResult (domain data, not envelope)
   */
  async listUsers(options: UserListOptions): Promise<UserListResult> {
    return this.useCases.listUsersUseCase.execute(options);
  }

  /**
   * Get user details
   * @returns UserDetails (domain data, not envelope)
   */
  async getUserDetails(userId: string): Promise<UserDetails> {
    return this.useCases.getUserDetailsUseCase.execute(userId);
  }

  /**
   * Create a new user (elevated permission)
   * @returns CreatedUser (domain data, not envelope)
   */
  async createUser(data: AdminCreateUser): Promise<CreatedUser> {
    return this.useCases.createUserUseCase.execute({
      email: data.email,
      password: data.password,
      name: data.name,
    });
  }

  /**
   * Update a user (elevated permission)
   * @returns UpdatedUser (domain data, not envelope)
   */
  async updateUser(userId: string, data: AdminUpdateUser): Promise<UpdatedUser> {
    return this.useCases.updateUserUseCase.execute(userId, data);
  }

  /**
   * Delete a user (elevated permission)
   * @returns void (not envelope)
   */
  async deleteUser(userId: string, requesterId: string): Promise<void> {
    // Additional business rule: prevent deleting last privileged user
    await this.preventLastPrivilegedUserDeletion(userId);

    return this.useCases.deleteUserUseCase.execute(userId, requesterId);
  }

  /**
   * Reset user password (elevated permission)
   * @returns void (not envelope)
   */
  async resetPassword(userId: string, data: AdminResetPassword): Promise<void> {
    return this.useCases.resetPasswordUseCase.execute(userId, data.newPassword);
  }

  /**
   * Prevent deleting the last user with elevated permissions.
   * This prevents a situation where no one can manage users anymore.
   */
  private async preventLastPrivilegedUserDeletion(userId: string): Promise<void> {
    const hasManagePermission = await this.authService.hasPermission(userId, 'user', 'manage');

    if (!hasManagePermission) return;

    const usersWithManage = await this.authService.countUsersWithRole('admin');

    if (usersWithManage <= 1) {
      throw new BadRequestException('Cannot delete the last user with management permissions');
    }
  }
}
