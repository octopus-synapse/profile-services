import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { runInTransaction } from '@/shared-kernel/persistence/transaction';
import type { OnboardingStepConfig } from '../../../domain/ports/onboarding-config.port';
import { OnboardingProgressRepositoryPort } from '../../../domain/ports/onboarding-progress.port';

export interface RestartOnboardingResult {
  success: boolean;
}

export interface RestartOnboardingOptions {
  /**
   * `clean = true` wipes progress to a true blank slate — currentStep set to
   * `welcome`, completedSteps empty, every section/field cleared. Use when
   * the user (or test fixture) wants to restart from absolute zero, not
   * carry forward profile/resume defaults. Default is `false` (legacy
   * "restart with existing data" UX).
   */
  clean?: boolean;
}

/**
 * Restart Onboarding Use Case
 *
 * Resets onboarding progress. Two modes:
 * - default: pre-populates progress from existing user/resume data and
 *   marks every non-final step as completed. Lets a returning user
 *   redo the flow without re-entering everything.
 * - `{ clean: true }`: wipes progress to an empty initial state.
 */
export class RestartOnboardingUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressRepository: OnboardingProgressRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    userId: string,
    steps: OnboardingStepConfig[],
    options: RestartOnboardingOptions = {},
  ): Promise<RestartOnboardingResult> {
    const clean = options.clean === true;

    // Get user's current profile data (only needed for the legacy mode).
    const userData = clean
      ? null
      : await this.prisma.user.findUnique({
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

    // Get user's existing resume (legacy mode only).
    const resume = clean
      ? null
      : await this.prisma.resume.findFirst({
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
    const completedSteps = clean
      ? []
      : allStepKeys.filter((key) => key !== 'review' && key !== 'complete');
    const progressInput = clean
      ? {
          currentStep: 'welcome' as const,
          completedSteps,
        }
      : {
          currentStep: 'personal-info' as const, // skip welcome
          completedSteps,
          username: userData?.username ?? undefined,
          personalInfo: {
            fullName: userData?.name ?? '',
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
          resumeStyleId: resume?.styleId ?? null,
          sections:
            resume?.resumeSections?.map((section) => ({
              sectionTypeKey: section.sectionType.key,
              items: section.items?.map((item) => ({ id: item.id, content: item.content })) ?? [],
            })) ?? [],
        };

    // P1 #17 — the previous wrapper opened a transaction but threaded
    // neither the progress repo calls nor the user.update through the
    // tx client, so a failure of one op left the others committed.
    // We now route every write through `tx`: the user-row flip happens
    // first so an unexpected error from the (heavier) progress write
    // still rolls the user flag back to its prior state.
    await runInTransaction(this.prisma, async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: null },
      });
      await this.progressRepository.deleteProgressWithTx(tx, userId);
      await this.progressRepository.upsertProgressWithTx(tx, userId, progressInput);
    });

    return { success: true };
  }
}
