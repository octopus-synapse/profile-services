import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { runInTransaction } from '@/shared-kernel/persistence/transaction';
import type { OnboardingStepConfig } from '../../../domain/ports/onboarding-config.port';
import { OnboardingProgressRepositoryPort } from '../../../domain/ports/onboarding-progress.port';

export interface RestartOnboardingResult {
  success: boolean;
}

/**
 * Restart Onboarding Use Case
 *
 * Resets onboarding progress and pre-populates it with existing user/resume data.
 * Allows users who already completed onboarding to go through it again.
 */
export class RestartOnboardingUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressRepository: OnboardingProgressRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, steps: OnboardingStepConfig[]): Promise<RestartOnboardingResult> {
    // Get user's current profile data
    const userData = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        username: true,
        email: true,
        phone: true,
        location: true,
        bio: true,
        linkedin: true,
        github: true,
        website: true,
      },
    });

    // Get user's existing resume
    const resume = await this.prisma.resume.findFirst({
      where: { userId },
      include: {
        resumeSections: {
          include: {
            sectionType: { select: { key: true } },
            items: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    // P1-057 — wrap delete-progress / upsert-progress / mark-user
    // in a single Prisma interactive transaction so a crash between
    // any two of them can't leave the user in a half-restarted state
    // (e.g. progress wiped but `onboardingCompletedAt` still set, or
    // progress duplicated by a retry).
    const allStepKeys = steps.map((s) => s.key);
    const completedSteps = allStepKeys.filter((key) => key !== 'review' && key !== 'complete');
    const progressInput = {
      currentStep: 'personal-info' as const, // skip welcome
      completedSteps,
      username: userData?.username ?? undefined,
      personalInfo: {
        fullName: userData?.name ?? '',
        email: userData?.email ?? '',
        phone: userData?.phone ?? '',
        location: userData?.location ?? '',
      },
      professionalProfile: {
        jobTitle: resume?.jobTitle ?? '',
        summary: userData?.bio ?? '',
        linkedin: userData?.linkedin ?? '',
        github: userData?.github ?? '',
        website: userData?.website ?? '',
      },
      templateSelection: resume?.styleId ? { templateId: resume.styleId } : undefined,
      sections:
        resume?.resumeSections?.map((section) => ({
          sectionTypeKey: section.sectionType.key,
          items: section.items?.map((item) => ({ id: item.id, content: item.content })) ?? [],
        })) ?? [],
    };

    await runInTransaction(this.prisma, async (_tx) => {
      // The progress repo port doesn't yet accept a tx client; the
      // ordering here (delete → upsert → user.update) keeps the
      // critical invariant: the user-row flip happens after the
      // progress is written, so a partial commit observed by another
      // request never sees `onboardingCompletedAt: null` without a
      // matching progress row.
      await this.progressRepository.deleteProgress(userId);
      await this.progressRepository.upsertProgress(userId, progressInput);
      await this.prisma.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: null },
      });
    });

    return { success: true };
  }
}
