/**
 * Onboarding Completion Adapter
 *
 * Wraps the Prisma transaction for the full onboarding completion flow:
 * resume upsert, section replacement, user update, progress deletion.
 */

import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
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
    private readonly logger: LoggerPort,
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
      // `items` is defaulted to `[]` by the Zod schema; the `?? []` belt
      // is for the rare case where this adapter is invoked outside the
      // parse pipeline (e.g. internal callers passing a hand-built shape).
      const items = section.items ?? [];
      if (!section.noData && items.length > 0) {
        await this.sectionAdapter.replaceSectionItems(tx, {
          resumeId,
          sectionTypeKey: section.sectionTypeKey,
          items: items.map((item) => item.content as Prisma.InputJsonValue),
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

    // Grant the `user` role inside the same transaction so domain
    // permissions (resume:create, social:use, etc.) become available
    // atomically with onboarding completion. Idempotent: if the user
    // already has the role (e.g., re-running after a partial failure),
    // the upsert no-ops.
    const userRole = await tx.role.findUnique({ where: { name: 'user' } });
    if (userRole) {
      await tx.userRoleAssignment.upsert({
        where: { userId_roleId: { userId, roleId: userRole.id } },
        create: { userId, roleId: userRole.id, assignedBy: 'onboarding-completion' },
        update: {},
      });
    }
  }
}
