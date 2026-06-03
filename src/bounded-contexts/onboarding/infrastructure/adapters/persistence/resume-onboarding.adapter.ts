/**
 * Resume Onboarding Adapter
 *
 * Prisma persistence logic for upserting resumes during onboarding.
 * Moved from application/services/resume-onboarding.service.ts.
 */

import { type Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { OnboardingResumeStyleNotFoundException } from '../../../domain/exceptions/onboarding-extra.exceptions';
import type { OnboardingData } from '../../../domain/schemas/onboarding.schema';

const CTX = 'ResumeOnboardingAdapter';
const DEFAULT_STYLE_NAME = 'default';

const WORK_EXPERIENCE_SECTION = 'work_experience_v1';
const ROLE_KEYS = ['role', 'jobTitle', 'title', 'position'] as const;

/** Pick the resume job title from the current work experience: the entry with
 *  no end date (the `allowPresentFlag` convention), else the first one. */
function deriveJobTitle(data: OnboardingData): string | undefined {
  const section = data.sections?.find((s) => s.sectionTypeKey === WORK_EXPERIENCE_SECTION);
  const items = section?.items ?? [];
  const contents = items.map((item) => {
    const obj = item as Record<string, unknown>;
    return (obj.content as Record<string, unknown> | undefined) ?? obj;
  });
  const current = contents.find((c) => !c.endDate) ?? contents[0];
  if (!current) return undefined;
  for (const key of ROLE_KEYS) {
    const value = current[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

export class ResumeOnboardingAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async upsertResume(userId: string, data: OnboardingData) {
    return this.upsertResumeWithTx(this.prisma, userId, data);
  }

  async upsertResumeWithTx(tx: Prisma.TransactionClient, userId: string, data: OnboardingData) {
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
      summary: professionalProfile.summary,
      linkedin: professionalProfile.linkedin,
      github: professionalProfile.github,
      website: professionalProfile.website,
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
