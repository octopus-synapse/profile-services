/**
 * User Admin Mutation Service
 * Single Responsibility: Create, Update, Delete operations for admin user management
 *
 * BUG-001/002 FIX: Uses Prisma unique constraint errors instead of TOCTOU pattern
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminCreateUser,
  AdminUpdateUser,
  AdminResetPassword,
} from '@octopus-synapse/profile-contracts';
import { UserRole } from '../../common/enums/user-role.enum';
import { PasswordService } from '../../auth/services/password.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';

@Injectable()
export class UserAdminMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async createUserAccount(createUserData: AdminCreateUser) {
    const { email, password, name, role } = createUserData;

    const hashedPassword = await this.passwordService.hash(password);

    // BUG-001 FIX: Use try-catch with unique constraint instead of check-then-create
    try {
      const userCreationData = {
        email,
        password: hashedPassword,
        name,
        role,
      };
      const createdUser = await this.prisma.user.create({
        data: userCreationData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      return {
        success: true,
        user: createdUser,
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

  async updateUserAccount(userId: string, updateUserData: AdminUpdateUser) {
    const existingUser = await this.findUserByIdOrThrow(userId);

    // BUG-016 FIX: Check if removing admin role from last admin
    if (updateUserData.role !== undefined) {
      await this.preventLastAdminRoleRemoval(
        existingUser.role as UserRole,
        updateUserData.role as UserRole,
      );
    }

    // BUG-001/002 FIX: Use try-catch with unique constraint for email/username
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateUserData,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          hasCompletedOnboarding: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        user: updatedUser,
        message: 'User updated successfully',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Determine which field caused the conflict
        const conflictTarget = error.meta?.target as string[] | undefined;
        if (conflictTarget?.includes('email')) {
          throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_IN_USE);
        }
        if (conflictTarget?.includes('username')) {
          throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE);
        }
        throw new ConflictException('A unique constraint was violated');
      }
      throw error;
    }
  }

  async deleteUserAccount(userId: string) {
    const existingUser = await this.findUserByIdOrThrow(userId);
    await this.preventLastAdminDeletion(existingUser.role as UserRole);

    await this.prisma.user.delete({ where: { id: userId } });

    return { success: true, message: 'User deleted successfully' };
  }

  async resetUserPassword(
    userId: string,
    resetPasswordData: AdminResetPassword,
  ) {
    await this.findUserByIdOrThrow(userId);

    const hashedPassword = await this.passwordService.hash(
      resetPasswordData.newPassword,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Password reset successfully' };
  }

  private async findUserByIdOrThrow(userId: string) {
    const foundUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!foundUser) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return foundUser;
  }

  private async preventLastAdminDeletion(role: UserRole): Promise<void> {
    if (role !== UserRole.ADMIN) return;

    const adminCount = await this.prisma.user.count({
      where: { role: UserRole.ADMIN },
    });
    if (adminCount <= 1) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_DELETE_LAST_ADMIN);
    }
  }

  /**
   * BUG-016 FIX: Prevent removing admin role from the last admin via UPDATE.
   * The rule is: if there's only one admin, they cannot change their own role.
   */
  private async preventLastAdminRoleRemoval(
    currentRole: UserRole,
    newRole: UserRole | null,
  ): Promise<void> {
    // Only check if user is currently admin and role is being changed
    if (currentRole !== UserRole.ADMIN) return;
    if (newRole === UserRole.ADMIN) return;

    // Check if this is the last admin
    const adminCount = await this.prisma.user.count({
      where: { role: UserRole.ADMIN },
    });

    if (adminCount <= 1) {
      throw new BadRequestException(
        ERROR_MESSAGES.CANNOT_REMOVE_LAST_ADMIN_ROLE,
      );
    }
  }
}
