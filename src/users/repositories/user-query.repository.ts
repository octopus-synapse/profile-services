/**
 * User Query Repository
 * Single Responsibility: Read operations for user data
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserPreferences } from '@prisma/client';

@Injectable()
export class UserQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(userId: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getUserWithPreferences(
    userId: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });
  }

  async findByUsername(
    username: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    return await this.prisma.user.findUnique({
      where: { username },
      include: { preferences: true },
    });
  }

  async getUserProfile(userId: string): Promise<Partial<User> | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        usernameUpdatedAt: true,
        displayName: true,
        photoURL: true,
        bio: true,
        location: true,
        phone: true,
        website: true,
        linkedin: true,
        github: true,
      },
    });
  }

  async getUserPreferences(userId: string): Promise<Partial<User> | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        palette: true,
        bannerColor: true,
        displayName: true,
        photoURL: true,
      },
    });
  }

  async getFullUserPreferences(
    userId: string,
  ): Promise<UserPreferences | null> {
    return await this.prisma.userPreferences.findUnique({
      where: { userId },
    });
  }

  async isUsernameTaken(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) return false;
    if (excludeUserId && user.id === excludeUserId) return false;
    return true;
  }

  async getLastUsernameUpdate(userId: string): Promise<Date | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { usernameUpdatedAt: true },
    });
    return user?.usernameUpdatedAt ?? null;
  }
}
