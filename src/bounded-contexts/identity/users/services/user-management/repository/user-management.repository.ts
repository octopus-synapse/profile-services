import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type CreatedUser,
  type UpdatedUser,
  type UpdateUserData,
  type UserDetails,
  type UserListItem,
  type UserListOptions,
  UserManagementRepositoryPort,
} from '../ports/user-management.port';

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
  role: true,
  lastLoginAt: true,
  _count: {
    select: {
      resumes: true,
    },
  },
} as const;

export class UserManagementRepository extends UserManagementRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findUsers(options: UserListOptions): Promise<{
    users: UserListItem[];
    total: number;
  }> {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(search);

    const [rawUsers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: USER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const users: UserListItem[] = rawUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      image: user.image,
      emailVerified: user.emailVerified,
      resumeCount: user._count.resumes,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
    }));

    return { users, total };
  }

  async findUserById(userId: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  async findUserDetails(userId: string): Promise<UserDetails | null> {
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

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      image: user.image,
      emailVerified: user.emailVerified,
      resumes: user.resumes,
      preferences: user.preferences,
      counts: user._count,
    };
  }

  async createUser(data: {
    email: string;
    hashedPassword: string;
    name?: string;
  }): Promise<CreatedUser> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.hashedPassword,
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }

  async updateUser(userId: string, data: UpdateUserData): Promise<UpdatedUser> {
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

  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async resetUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
  }

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
}
