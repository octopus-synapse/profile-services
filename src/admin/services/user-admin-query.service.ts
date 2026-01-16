/**
 * User Admin Query Service
 * Single Responsibility: Read operations for admin user management
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UserRole } from '../../common/enums/user-role.enum';

export interface GetAllUsersOptions {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
}

const USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  username: true,
  role: true,
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
export class UserAdminQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUsersWithPagination(queryOptions: GetAllUsersOptions) {
    const { page, limit, search, role } = queryOptions;
    const skipCount = (page - 1) * limit;

    const whereClause = this.buildWhereClause(search, role);

    const [paginatedUsers, totalUserCount] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip: skipCount,
        take: limit,
        select: USER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    const paginationMetadata = {
      page,
      limit,
      total: totalUserCount,
      totalPages: Math.ceil(totalUserCount / limit),
    };

    return {
      users: paginatedUsers,
      pagination: paginationMetadata,
    };
  }

  async findUserByIdWithDetails(userId: string) {
    const foundUser = await this.prisma.user.findUnique({
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

    if (!foundUser) {
      throw new NotFoundException('User not found');
    }

    const { password: _passwordField, ...userWithoutPassword } = foundUser;
    return userWithoutPassword;
  }

  private buildWhereClause(
    search?: string,
    role?: UserRole,
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    return where;
  }
}
