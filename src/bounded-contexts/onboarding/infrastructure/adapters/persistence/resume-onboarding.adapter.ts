/**
 * Resume Onboarding Adapter
 *
 * Prisma persistence logic for upserting resumes during onboarding.
 * Moved from application/services/resume-onboarding.service.ts.
 */

import type { Locale } from '@packages/i18n';
import { type Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { deriveJobTitle } from '../../../application/mappers/onboarding-resume.mapper';
import { OnboardingResumeStyleNotFoundException } from '../../../domain/exceptions/onboarding-extra.exceptions';
import type { OnboardingData } from '../../../domain/schemas/onboarding.schema';

const CTX = 'ResumeOnboardingAdapter';
const DEFAULT_STYLE_NAME = 'default';

export class ResumeOnboardingAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async upsertResume(userId: string, data: OnboardingData, authoredLocale?: Locale | null) {
    return this.upsertResumeWithTx(this.prisma, userId, data, authoredLocale);
  }

  async upsertResumeWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    data: OnboardingData,
    authoredLocale?: Locale | null,
  ) {
    const { personalInfo, professionalProfile, resumeStyleId } = data;

    const existingResume = await tx.resume.findFirst({
      where: { userId },
    });

    const isFirstResume = !existingResume;

    // Onboarding no longer asks for a job title directly — it derives from the
    // current work experience (falling back to the headline).
    const resumeData = {
      fullName: personalInfo.fullName,
      phone: personalInfo.phone,
      location: personalInfo.location,
      jobTitle: deriveJobTitle(data) ?? professionalProfile.headline,
      headline: professionalProfile.headline ?? null,
      summary: professionalProfile.summary,
      linkedin: professionalProfile.linkedin,
      github: professionalProfile.github,
      website: professionalProfile.website,
      // ADR-003 §10: record the language the person actually wrote in instead
      // of letting every résumé inherit the column default. Omitted (not
      // null-written) when the request gave us nothing to go on, so the
      // default still applies on create and an existing value survives an
      // onboarding re-run.
      ...(authoredLocale ? { language: authoredLocale } : {}),
    };

    const selectedStyleId = await this.resolveStyleId(tx, resumeStyleId ?? null);

    const resume = await tx.resume.upsert({
      where: { id: existingResume?.id ?? 'nonexistent' },
      update: { ...resumeData, styleId: selectedStyleId },
      create: { userId, ...resumeData, styleId: selectedStyleId },
    });

    if (isFirstResume) {
      await tx.user.update({
        where: { id: userId },
        data: { primaryResumeId: resume.id },
      });
      this.logger.log(`Set resume ${resume.id} as primary for user ${userId}`, CTX);
    }

    this.logger.log(`Applied style ${selectedStyleId} to resume ${resume.id}`, CTX);
    this.logger.log(`Resume upserted: ${resume.id}`, CTX);
    return resume;
  }

  /**
   * Resolve the ResumeStyle id to attach to the new resume. The chosen
   * id comes from the onboarding `resume-style` step (which the picker
   * already validated against `ResumeStyle WHERE isSystem=true`).
   * Resolution order:
   *
   *   1. The caller's selection, if it exists in `ResumeStyle`.
   *   2. The seeded "default" style by name (when present).
   *   3. ANY existing style ordered by `createdAt` — covers seeds that
   *      ship named variants (`ATS Classic`, `ATS Compact`) without a
   *      style literally called "default".
   *
   * The function never returns null. If the table is completely empty,
   * the data model is inconsistent and we throw rather than silently
   * persist a styleless resume.
   */
  private async resolveStyleId(
    tx: Prisma.TransactionClient,
    chosenStyleId: string | null,
  ): Promise<string> {
    if (chosenStyleId) {
      const byId = await tx.resumeStyle.findUnique({ where: { id: chosenStyleId } });
      if (byId) return byId.id;
      this.logger.warn(
        `Onboarding picked style ${chosenStyleId} but it no longer exists; falling back.`,
        CTX,
      );
    }

    const byDefaultName = await tx.resumeStyle.findFirst({
      where: { name: { equals: DEFAULT_STYLE_NAME, mode: 'insensitive' } },
    });
    if (byDefaultName) return byDefaultName.id;

    const anyStyle = await tx.resumeStyle.findFirst({ orderBy: { createdAt: 'asc' } });
    if (anyStyle) {
      this.logger.warn(
        `No "${DEFAULT_STYLE_NAME}" style seeded — falling back to "${anyStyle.name}" (${anyStyle.id}).`,
        CTX,
      );
      return anyStyle.id;
    }

    throw new OnboardingResumeStyleNotFoundException(chosenStyleId ?? '(none)');
  }
}
