import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AccountData, AccountLifecycleRepositoryPort, CreateAccountData } from '../../domain/ports';

@Injectable()
export class PrismaAccountLifecycleRepository implements AccountLifecycleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<AccountData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      name: user.name,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt,
    };
  }

  async findByEmail(email: string): Promise<AccountData | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      name: user.name,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt,
    };
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }

  async create(data: CreateAccountData): Promise<AccountData> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        isActive: true,
        emailVerified: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      id: user.id,
      email: user.email ?? '',
      name: user.name,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt,
    };
  }

  async deactivate(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async reactivate(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  async delete(userId: string): Promise<void> {
    // Delete all associated data in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete tokens
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });

      // Delete user
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
