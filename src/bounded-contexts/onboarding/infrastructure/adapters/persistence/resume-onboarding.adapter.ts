/**
 * Resume Onboarding Adapter
 *
 * Prisma persistence logic for upserting resumes during onboarding.
 * Moved from application/services/resume-onboarding.service.ts.
 */

import { type Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { OnboardingData } from '../../../domain/schemas/onboarding.schema';
import { normalizeTemplateSelection } from '../../../domain/schemas/onboarding-data.schema';

const CTX = 'ResumeOnboardingAdapter';

export class ResumeOnboardingAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async upsertResume(userId: string, data: OnboardingData) {
    return this.upsertResumeWithTx(this.prisma, userId, data);
  }

  async upsertResumeWithTx(tx: Prisma.TransactionClient, userId: string, data: OnboardingData) {
    const { personalInfo, professionalProfile, templateSelection } = data;

    const normalized = normalizeTemplateSelection(templateSelection);

    const existingResume = await tx.resume.findFirst({
      where: { userId },
    });

    const isFirstResume = !existingResume;

    // The `template` column was replaced by `styleId` on the resume row —
    // layout variance is now a property of the ResumeStyle, not the Resume.
    const resumeData = {
      fullName: personalInfo.fullName,
      emailContact: personalInfo.email,
      phone: personalInfo.phone,
      location: personalInfo.location,
      jobTitle: professionalProfile.jobTitle,
      summary: professionalProfile.summary,
      linkedin: professionalProfile.linkedin,
      github: professionalProfile.github,
      website: professionalProfile.website,
    };

    const selectedStyleId = await this.resolveStyleId(tx, normalized.colorScheme);

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

    if (selectedStyleId) {
      this.logger.log(`Applied style ${selectedStyleId} to resume ${resume.id}`, CTX);
    }

    this.logger.log(`Resume upserted: ${resume.id}`, CTX);
    return resume;
  }

  /**
   * Resolve the ResumeStyle ID from the user's selection. Accepts either an
   * explicit style id or a style name (case-insensitive).
   */
  private async resolveStyleId(
    tx: Prisma.TransactionClient,
    styleIdOrName: string,
  ): Promise<string | null> {
    const byId = await tx.resumeStyle.findUnique({ where: { id: styleIdOrName } });
    if (byId) return byId.id;

    const byName = await tx.resumeStyle.findFirst({
      where: { name: { equals: styleIdOrName, mode: 'insensitive' } },
    });
    return byName?.id ?? null;
  }
}
