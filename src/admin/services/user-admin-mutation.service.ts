/**
 * User Admin Mutation Service
 * Single Responsibility: Create, Update, Delete operations for admin user management
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AdminResetPasswordDto } from '../dto/reset-password.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { PasswordService } from '../../auth/services/password.service';
import { ERROR_MESSAGES } from '../../common/constants/config';

@Injectable()
export class UserAdminMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async create(dto: CreateUserDto) {
    const { email, password, name, role } = dto;

    await this.ensureEmailNotExists(email);

    const hashedPassword = await this.passwordService.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role ?? UserRole.USER,
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
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findUserOrThrow(id);
    await this.ensureUniqueFields(dto, user);

    // BUG-016 FIX: Check if removing admin role from last admin
    if (dto.role !== undefined) {
      await this.preventLastAdminRoleRemoval(user.role as UserRole, dto.role);
    }

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
  }

  async delete(id: string) {
    const user = await this.findUserOrThrow(id);
    await this.preventLastAdminDeletion(user.role as UserRole);

    await this.prisma.user.delete({ where: { id } });

    return { success: true, message: 'User deleted successfully' };
  }

  async resetPassword(id: string, dto: AdminResetPasswordDto) {
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

  private async ensureEmailNotExists(email: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }
  }

  private async ensureUniqueFields(
    dto: UpdateUserDto,
    currentUser: { email: string | null; username: string | null },
  ): Promise<void> {
    if (dto.email && dto.email !== currentUser.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing)
        throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_IN_USE);
    }

    if (dto.username && dto.username !== currentUser.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existing)
        throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE);
    }
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
