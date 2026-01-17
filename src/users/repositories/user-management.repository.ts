/**
 * User Management Repository
 * Data access layer for user management operations
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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

@Injectable()
export class UserManagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find users with pagination and search
   */
  async findManyPaginated(options: {
    where: Prisma.UserWhereInput;
    skip: number;
    take: number;
  }) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: options.where,
        skip: options.skip,
        take: options.take,
        select: USER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: options.where }),
    ]);

    return { users, total };
  }

  /**
   * Find a user by ID with full details
   */
  async findByIdWithDetails(userId: string) {
    return this.prisma.user.findUnique({
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
  }

  /**
   * Find a user by ID (for validation)
   */
  async findById(userId: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  /**
   * Create a new user
   */
  async create(data: { email: string; password: string; name?: string }) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }

  /**
   * Update a user by ID
   */
  async update(
    userId: string,
    data: Partial<{
      email: string;
      name: string;
      username: string;
      hasCompletedOnboarding: boolean;
    }>,
  ) {
    return this.prisma.user.update({
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
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Delete a user by ID
   */
  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
