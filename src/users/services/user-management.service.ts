/**
 * User Management Service
 *
 * Operations that require elevated permissions on user resources.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: CRUD operations on users requiring 'user:*' permissions.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PasswordService } from '../../auth/services/password.service';
import { AuthorizationService } from '../../authorization';
import {
  UserNotFoundError,
  EmailConflictError,
  DuplicateResourceError,
  BusinessRuleError,
} from '@octopus-synapse/profile-contracts';
import type {
  AdminCreateUser,
  AdminUpdateUser,
  AdminResetPassword,
} from '@octopus-synapse/profile-contracts';
import { UserManagementRepository } from '../repositories';

// ============================================================================
// Types
// ============================================================================

export interface UserListOptions {
  page: number;
  limit: number;
  search?: string;
  roleName?: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class UserManagementService {
  constructor(
    private readonly repository: UserManagementRepository,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthorizationService,
  ) {}

  // ============================================================================
  // Query Operations (require 'user:read' or 'user:manage')
  // ============================================================================

  async listUsers(options: UserListOptions) {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(search);

    const { users, total } = await this.repository.findManyPaginated({
      where,
      skip,
      take: limit,
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.repository.findByIdWithDetails(userId);

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // ============================================================================
  // Mutation Operations (require 'user:create', 'user:update', 'user:delete')
  // ============================================================================

  async createUser(data: AdminCreateUser) {
    const { email, password, name } = data;
    const hashedPassword = await this.passwordService.hash(password);

    try {
      const user = await this.repository.create({
        email,
        password: hashedPassword,
        name,
      });

      return {
        success: true,
        user,
        message: 'User created successfully',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new EmailConflictError(email);
      }
      throw error;
    }
  }

  async updateUser(userId: string, data: AdminUpdateUser) {
    await this.ensureUserExists(userId);

    try {
      const user = await this.repository.update(userId, data);

      return {
        success: true,
        user,
        message: 'User updated successfully',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes('email')) {
          throw new EmailConflictError(data.email ?? 'unknown');
        }
        if (target?.includes('username')) {
          throw new DuplicateResourceError(
            'User',
            'username',
            'provided value',
          );
        }
        throw new DuplicateResourceError('User', 'field', 'value');
      }
      throw error;
    }
  }

  async deleteUser(userId: string, requesterId: string) {
    await this.ensureUserExists(userId);
    this.preventSelfDeletion(userId, requesterId);

    // Check if user is last with 'user:delete' permission (prevents lockout)
    await this.preventLastPrivilegedUserDeletion(userId);

    await this.repository.delete(userId);

    return { success: true, message: 'User deleted successfully' };
  }

  async resetPassword(userId: string, data: AdminResetPassword) {
    await this.ensureUserExists(userId);

    const hashedPassword = await this.passwordService.hash(data.newPassword);

    await this.repository.updatePassword(userId, hashedPassword);

    return { success: true, message: 'Password reset successfully' };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private buildWhereClause(search?: string): Prisma.UserWhereInput {
    if (!search) return {};

    return {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new UserNotFoundError(userId);
    }
  }

  private preventSelfDeletion(userId: string, requesterId: string): void {
    if (userId === requesterId) {
      throw new BusinessRuleError('Cannot delete your own account', { userId });
    }
  }

  /**
   * Prevent deleting the last user with elevated permissions.
   * This prevents a situation where no one can manage users anymore.
   */
  private async preventLastPrivilegedUserDeletion(
    userId: string,
  ): Promise<void> {
    const hasManagePermission = await this.authService.hasPermission(
      userId,
      'user',
      'manage',
    );

    if (!hasManagePermission) return;

    // Count users with user:manage permission
    const usersWithManage = await this.authService.countUsersWithRole('admin');

    if (usersWithManage <= 1) {
      throw new BusinessRuleError(
        'Cannot delete the last user with management permissions',
        { userId },
      );
    }
  }
}
