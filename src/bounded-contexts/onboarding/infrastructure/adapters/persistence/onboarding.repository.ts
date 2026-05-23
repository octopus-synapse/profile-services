import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type {
  OnboardingStatus,
  TransactionClient,
  UserForOnboarding,
} from '../../../domain/ports/onboarding.port';
import { OnboardingRepositoryPort } from '../../../domain/ports/onboarding.port';
import type { OnboardingData } from '../../../domain/schemas/onboarding.schema';

export class OnboardingRepository extends OnboardingRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findUserById(userId: string): Promise<UserForOnboarding | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, onboardingCompletedAt: true },
    });
    if (!row) return null;
    return { id: row.id, hasCompletedOnboarding: row.onboardingCompletedAt !== null };
  }

  async getOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });
    if (!row) return null;
    return {
      hasCompletedOnboarding: row.onboardingCompletedAt !== null,
      onboardingCompletedAt: row.onboardingCompletedAt,
    };
  }

  async markOnboardingComplete(
    tx: TransactionClient,
    userId: string,
    data: OnboardingData,
  ): Promise<void> {
    const prismaTx = tx as Prisma.TransactionClient;
    await prismaTx.user.update({
      where: { id: userId },
      data: {
        onboardingCompletedAt: new Date(),
        username: data.username,
        name: data.personalInfo.fullName,
        phone: data.personalInfo.phone ?? null,
        location: data.personalInfo.location ?? null,
        bio: data.professionalProfile.summary,
        headline: data.professionalProfile.headline ?? null,
        linkedin: data.professionalProfile.linkedin ?? null,
        github: data.professionalProfile.github ?? null,
        website: data.professionalProfile.website ?? null,
      },
    });
  }

  async executeInTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
    options?: { timeout?: number },
  ): Promise<T> {
    return this.prisma.$transaction(fn as (tx: Prisma.TransactionClient) => Promise<T>, options);
  }
}
