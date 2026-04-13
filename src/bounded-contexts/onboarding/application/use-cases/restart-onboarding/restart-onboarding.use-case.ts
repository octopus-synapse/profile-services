import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingStepConfig } from '../../../domain/ports/onboarding-config.port';
import type { OnboardingProgressRepositoryPort } from '../../../domain/ports/onboarding-progress.port';

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

    // Delete any existing progress
    await this.progressRepository.deleteProgress(userId);

    // Build pre-populated progress from existing data
    const allStepKeys = steps.map((s) => s.key);
    const completedSteps = allStepKeys.filter((key) => key !== 'review' && key !== 'complete');

    await this.progressRepository.upsertProgress(userId, {
      currentStep: 'personal-info', // skip welcome
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
      templateSelection: resume?.activeThemeId ? { templateId: resume.activeThemeId } : undefined,
      sections:
        resume?.resumeSections?.map((section) => ({
          sectionTypeKey: section.sectionType.key,
          items:
            section.items?.map((item) => ({
              id: item.id,
              content: item.content,
            })) ?? [],
        })) ?? [],
    });

    // Mark user as needing onboarding again
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hasCompletedOnboarding: false,
        onboardingCompletedAt: null,
      },
    });

    return { success: true };
  }
}
