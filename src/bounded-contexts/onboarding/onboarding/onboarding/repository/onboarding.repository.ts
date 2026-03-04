import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../../schemas/onboarding.schema';
import type {
  OnboardingStatus,
  TransactionClient,
  UserForOnboarding,
} from '../ports/onboarding.port';
import { OnboardingRepositoryPort } from '../ports/onboarding.port';

export class OnboardingRepository extends OnboardingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findUserById(userId: string): Promise<UserForOnboarding | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, hasCompletedOnboarding: true },
    });
  }

  async getOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { hasCompletedOnboarding: true, onboardingCompletedAt: true },
    });
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
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date(),
        username: data.username,
        displayName: data.personalInfo.fullName,
        phone: data.personalInfo.phone ?? null,
        location: data.personalInfo.location ?? null,
        bio: data.professionalProfile.summary,
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
