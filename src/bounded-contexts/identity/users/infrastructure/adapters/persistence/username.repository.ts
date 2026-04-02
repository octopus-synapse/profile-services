import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { UsernameRepositoryPort } from '../../../application/ports/username.port';

export class UsernameRepository extends UsernameRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findUserById(userId: string): Promise<{ id: string; username: string | null } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
  }

  async updateUsername(userId: string, username: string): Promise<{ username: string }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username,
        usernameUpdatedAt: new Date(),
      },
      select: { username: true },
    });

    return { username: user.username ?? '' };
  }

  async findLastUsernameUpdateByUserId(userId: string): Promise<Date | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { usernameUpdatedAt: true },
    });

    return user?.usernameUpdatedAt ?? null;
  }

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existingUser) return false;
    if (excludeUserId && existingUser.id === excludeUserId) return false;

    return true;
  }
}
