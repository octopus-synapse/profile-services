import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  OnboardingProgressData,
  ProgressRecord,
  TransactionClient,
} from '../ports/onboarding-progress.port';
import { OnboardingProgressRepositoryPort } from '../ports/onboarding-progress.port';

type InputJsonValue = Prisma.InputJsonValue;

export class OnboardingProgressRepository extends OnboardingProgressRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findProgressByUserId(userId: string): Promise<ProgressRecord | null> {
    const record = await this.prisma.onboardingProgress.findUnique({
      where: { userId },
    });

    if (!record) return null;

    // Map Prisma JsonValue types to domain types
    return {
      userId: record.userId,
      currentStep: record.currentStep,
      completedSteps: record.completedSteps,
      username: record.username,
      personalInfo: record.personalInfo,
      professionalProfile: record.professionalProfile,
      experiences: record.experiences as unknown[] | null,
      noExperience: record.noExperience,
      education: record.education as unknown[] | null,
      noEducation: record.noEducation,
      skills: record.skills as unknown[] | null,
      noSkills: record.noSkills,
      languages: record.languages as unknown[] | null,
      templateSelection: record.templateSelection,
      updatedAt: record.updatedAt,
    };
  }

  async upsertProgress(
    userId: string,
    data: OnboardingProgressData,
  ): Promise<{ currentStep: string; completedSteps: string[] }> {
    const progressData = {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      username: data.username ?? undefined,
      personalInfo: data.personalInfo as InputJsonValue | undefined,
      professionalProfile: data.professionalProfile as InputJsonValue | undefined,
      experiences: data.experiences as InputJsonValue | undefined,
      noExperience: data.noExperience ?? false,
      education: data.education as InputJsonValue | undefined,
      noEducation: data.noEducation ?? false,
      skills: data.skills as InputJsonValue | undefined,
      noSkills: data.noSkills ?? false,
      languages: data.languages as InputJsonValue | undefined,
      templateSelection: data.templateSelection as InputJsonValue | undefined,
    };

    const progress = await this.prisma.onboardingProgress.upsert({
      where: { userId },
      update: progressData,
      create: { userId, ...progressData },
    });

    return {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
    };
  }

  async deleteProgress(userId: string): Promise<void> {
    await this.prisma.onboardingProgress.deleteMany({ where: { userId } });
  }

  async deleteProgressWithTx(tx: TransactionClient, userId: string): Promise<void> {
    const prismaTx = tx as Prisma.TransactionClient;
    await prismaTx.onboardingProgress.deleteMany({ where: { userId } });
  }

  async findUserByUsername(username: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
  }
}
