/**
 * Auth User Repository
 * Single Responsibility: User-related database operations for authentication
 *
 * Encapsulates all User model Prisma operations used by auth services.
 * This is the infrastructure layer for authentication domain.
 */

import { Injectable } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type UserWithPassword = Pick<User, 'id' | 'email' | 'password'>;

export type UserForAuth = Omit<User, 'password'>;

export type CreateUserData = {
  email: string;
  name: string;
  password: string;
  hasCompletedOnboarding: boolean;
};

@Injectable()
export class AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find user by email for authentication
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID with password for validation
   */
  async findByIdWithPassword(userId: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });
  }

  /**
   * Find user by ID for token refresh
   */
  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Create a new user account
   * Throws Prisma.PrismaClientKnownRequestError with code P2002 on duplicate email
   */
  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  /**
   * Update user email (resets emailVerified)
   * Throws Prisma.PrismaClientKnownRequestError with code P2002 on duplicate email
   */
  async updateEmail(userId: string, newEmail: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        emailVerified: null,
      },
    });
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Set email as verified
   */
  async markEmailVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }

  /**
   * Delete user account
   */
  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Check if error is unique constraint violation
   */
  isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  /**
   * Find user by email for verification flow
   */
  async findByEmailForVerification(email: string): Promise<{
    id: string;
    email: string | null;
    name: string | null;
    emailVerified: Date | null;
  } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, emailVerified: true },
    });
  }

  /**
   * Mark email as verified by email address
   */
  async markEmailVerifiedByEmail(email: string): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });
  }

  /**
   * Find user by ID for GDPR export
   */
  async findByIdForExport(userId: string): Promise<{
    id: string;
    email: string | null;
    name: string | null;
    username: string | null;
    hasCompletedOnboarding: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        hasCompletedOnboarding: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find user by ID with email for deletion verification
   */
  async findByIdWithEmail(
    userId: string,
  ): Promise<{ id: string; email: string | null } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
  }
}
