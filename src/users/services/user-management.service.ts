/**
 * User Management Service
 *
 * Operations that require elevated permissions on user resources.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: CRUD operations on users requiring 'user:*' permissions.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../../auth/services/password.service';
import { AuthorizationService } from '../../authorization';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
import type {
  AdminCreateUser,
  AdminUpdateUser,
  AdminResetPassword,
} from '@octopus-synapse/profile-contracts';

// ============================================================================
// Types
// ============================================================================

export interface UserListOptions {
  page: number;
  limit: number;
  search?: string;
  roleName?: string;
}

const USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  username: true,
  hasCompletedOnboarding: true,
  createdAt: true,
  updatedAt: true,
  image: true,
  emailVerified: true,
  _count: {
    select: {
      resumes: true,
    },
  },
} as const;

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class UserManagementService {
  constructor(
    private readonly prisma: PrismaService,
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

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: USER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        resumes: {
          select: {
            id: true,
            title: true,
            template: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        preferences: true,
        _count: {
          select: { accounts: true, sessions: true, resumes: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
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
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
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
        throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async updateUser(userId: string, data: AdminUpdateUser) {
    await this.ensureUserExists(userId);

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          hasCompletedOnboarding: true,
          updatedAt: true,
        },
      });

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
          throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_IN_USE);
        }
        if (target?.includes('username')) {
          throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE);
        }
        throw new ConflictException('A unique constraint was violated');
      }
      throw error;
    }
  }

  async deleteUser(userId: string, requesterId: string) {
    await this.ensureUserExists(userId);
    await this.preventSelfDeletion(userId, requesterId);

    // Check if user is last with 'user:delete' permission (prevents lockout)
    await this.preventLastPrivilegedUserDeletion(userId);

    await this.prisma.user.delete({ where: { id: userId } });

    return { success: true, message: 'User deleted successfully' };
  }

  async resetPassword(userId: string, data: AdminResetPassword) {
    await this.ensureUserExists(userId);

    const hashedPassword = await this.passwordService.hash(data.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
  }

  private preventSelfDeletion(userId: string, requesterId: string): void {
    if (userId === requesterId) {
      throw new BadRequestException('Cannot delete your own account');
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
      throw new BadRequestException(
        'Cannot delete the last user with management permissions',
      );
    }
  }
}
