/**
 * Onboarding Completion Adapter
 *
 * Wraps the Prisma transaction for the full onboarding completion flow:
 * resume upsert, section replacement, user update, progress deletion.
 */

import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type CompletionResult,
  OnboardingCompletionPort,
} from '../../../domain/ports/onboarding-completion.port';
import type { OnboardingData } from '../../../domain/schemas/onboarding-data.schema';
import type { ResumeOnboardingAdapter } from './resume-onboarding.adapter';
import type { ResumeSectionOnboardingAdapter } from './resume-section-onboarding.adapter';

const TRANSACTION_TIMEOUT_MS = 120000;

export class OnboardingCompletionAdapter extends OnboardingCompletionPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeAdapter: ResumeOnboardingAdapter,
    private readonly sectionAdapter: ResumeSectionOnboardingAdapter,
  ) {
    super();
  }

  async executeCompletion(userId: string, data: OnboardingData): Promise<CompletionResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const resume = await this.resumeAdapter.upsertResumeWithTx(tx, userId, data);
        await this.saveSections(tx, resume.id, data);
        await this.markOnboardingComplete(tx, userId, data);
        await tx.onboardingProgress.deleteMany({ where: { userId } });

        return { resumeId: resume.id };
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }

  private async saveSections(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ): Promise<void> {
    for (const section of data.sections) {
      if (!section.noData && section.items.length > 0) {
        await this.sectionAdapter.replaceSectionItems(tx, {
          resumeId,
          sectionTypeKey: section.sectionTypeKey,
          items: section.items.map((item) => item.content as Prisma.InputJsonValue),
        });
      }
    }
  }

  private async markOnboardingComplete(
    tx: Prisma.TransactionClient,
    userId: string,
    data: OnboardingData,
  ): Promise<void> {
    await tx.user.update({
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
}
