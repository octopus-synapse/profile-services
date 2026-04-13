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
import type {
  AdminCreateUserDto,
  AdminResetPasswordDto,
  AdminUpdateUserDto,
} from '../../dto/controller-request.dto';
import {
  type CreatedUser,
  type UpdatedUser,
  USER_MANAGEMENT_USE_CASES,
  type UserDetails,
  type UserListOptions,
  type UserListResult,
  type UserManagementUseCases,
} from '../ports/user-management.port';

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
  async createUser(data: AdminCreateUserDto): Promise<CreatedUser> {
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
  async updateUser(userId: string, data: AdminUpdateUserDto): Promise<UpdatedUser> {
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
  async resetPassword(userId: string, data: AdminResetPasswordDto): Promise<void> {
    return this.useCases.resetPasswordUseCase.execute(userId, data.newPassword);
  }

  /**
   * Assign roles to a user
   */
  async assignRoles(userId: string, roles: string[], _assignedBy: string): Promise<void> {
    const validRoles = ['role_user', 'role_admin'];
    for (const role of roles) {
      if (!validRoles.includes(role)) {
        throw new BadRequestException(`Invalid role: ${role}`);
      }
    }

    // Prevent removing admin role from last admin
    if (!roles.includes('role_admin')) {
      const currentUser = await this.useCases.getUserDetailsUseCase.execute(userId);
      if (
        (currentUser as Record<string, unknown>).roles &&
        ((currentUser as Record<string, unknown>).roles as string[]).includes('role_admin')
      ) {
        const adminCount = await this.authService.countUsersWithRole('admin');
        if (adminCount <= 1) {
          throw new BadRequestException('Cannot remove admin role from the last admin user');
        }
      }
    }

    // Use the use case or direct Prisma update
    await this.useCases.updateUserUseCase.execute(userId, { roles } as Record<string, unknown>);
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
