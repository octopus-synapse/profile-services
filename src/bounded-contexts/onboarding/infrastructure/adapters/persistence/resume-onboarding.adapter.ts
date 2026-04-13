/**
 * Resume Onboarding Adapter
 *
 * Prisma persistence logic for upserting resumes during onboarding.
 * Moved from application/services/resume-onboarding.service.ts.
 */

import { Logger } from '@nestjs/common';
import { type Prisma, ResumeTemplate } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../../../domain/schemas/onboarding.schema';
import { normalizeTemplateSelection } from '../../../domain/schemas/onboarding-data.schema';

const VALID_TEMPLATES = Object.values(ResumeTemplate);
const DEFAULT_TEMPLATE = ResumeTemplate.PROFESSIONAL;

export class ResumeOnboardingAdapter {
  private readonly logger = new Logger(ResumeOnboardingAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertResume(userId: string, data: OnboardingData) {
    return this.upsertResumeWithTx(this.prisma, userId, data);
  }

  async upsertResumeWithTx(tx: Prisma.TransactionClient, userId: string, data: OnboardingData) {
    const { personalInfo, professionalProfile, templateSelection } = data;

    const normalized = normalizeTemplateSelection(templateSelection);
    const templateCandidate = normalized.templateId.toUpperCase();
    // Validate template is a valid enum value, fallback to PROFESSIONAL if not
    const template = VALID_TEMPLATES.includes(templateCandidate as ResumeTemplate)
      ? (templateCandidate as ResumeTemplate)
      : DEFAULT_TEMPLATE;

    const existingResume = await tx.resume.findFirst({
      where: { userId },
    });

    const isFirstResume = !existingResume;

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
      template,
    };

    // Resolve the theme the user selected
    const selectedThemeId = await this.resolveThemeId(tx, normalized.colorScheme);

    const resume = await tx.resume.upsert({
      where: { id: existingResume?.id ?? 'nonexistent' },
      update: { ...resumeData, activeThemeId: selectedThemeId },
      create: { userId, ...resumeData, activeThemeId: selectedThemeId },
    });

    if (isFirstResume) {
      await tx.user.update({
        where: { id: userId },
        data: { primaryResumeId: resume.id },
      });
      this.logger.log(`Set resume ${resume.id} as primary for user ${userId}`);
    }

    if (selectedThemeId) {
      this.logger.log(`Applied theme ${selectedThemeId} to resume ${resume.id}`);
    }

    this.logger.log(`Resume upserted: ${resume.id}`);
    return resume;
  }

  /**
   * Resolve the theme ID from the user's selection.
   * The colorScheme field contains the theme ID selected during onboarding.
   */
  private async resolveThemeId(
    tx: Prisma.TransactionClient,
    themeIdOrName: string,
  ): Promise<string | null> {
    // Try by exact ID first
    const byId = await tx.resumeTheme.findUnique({ where: { id: themeIdOrName } });
    if (byId) return byId.id;

    // Fallback: search by name
    const byName = await tx.resumeTheme.findFirst({
      where: { name: { equals: themeIdOrName, mode: 'insensitive' } },
    });
    return byName?.id ?? null;
  }
}
