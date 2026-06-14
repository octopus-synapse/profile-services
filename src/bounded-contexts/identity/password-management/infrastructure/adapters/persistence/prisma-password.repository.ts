import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { UserWithPassword } from '../../../domain/ports';
import { PasswordRepositoryPort } from '../../../domain/ports';

export class PrismaPasswordRepository implements PasswordRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (!user?.passwordHash) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      name: user.name,
      passwordHash: user.passwordHash,
    };
  }

  async findById(userId: string): Promise<UserWithPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (!user?.passwordHash) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      name: user.name,
      passwordHash: user.passwordHash,
    };
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    return user !== null;
  }

  async updateEmail(userId: string, newEmail: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail, emailVerified: new Date() },
    });
  }
}
