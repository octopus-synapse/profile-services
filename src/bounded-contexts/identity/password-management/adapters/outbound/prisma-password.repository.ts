import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { PasswordRepositoryPort, UserWithPassword } from '../../ports/outbound';

@Injectable()
export class PrismaPasswordRepository implements PasswordRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
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
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
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
}
