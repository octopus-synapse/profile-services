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

  async create(dto: AdminCreateUser) {
    const { email, password, name, role } = dto;

    const hashedPassword = await this.passwordService.hash(password);

    // BUG-001 FIX: Use try-catch with unique constraint instead of check-then-create
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      return { success: true, user, message: 'User created successfully' };
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

  async update(id: string, dto: AdminUpdateUser) {
    const user = await this.findUserOrThrow(id);

    // BUG-016 FIX: Check if removing admin role from last admin
    if (dto.role !== undefined) {
      await this.preventLastAdminRoleRemoval(
        user.role as UserRole,
        dto.role as UserRole,
      );
    }

    // BUG-001/002 FIX: Use try-catch with unique constraint for email/username
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: dto,
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

  async delete(id: string) {
    const user = await this.findUserOrThrow(id);
    await this.preventLastAdminDeletion(user.role as UserRole);

    await this.prisma.user.delete({ where: { id } });

    return { success: true, message: 'User deleted successfully' };
  }

  async resetPassword(id: string, dto: AdminResetPassword) {
    await this.findUserOrThrow(id);

    const hashedPassword = await this.passwordService.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Password reset successfully' };
  }

  private async findUserOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
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
