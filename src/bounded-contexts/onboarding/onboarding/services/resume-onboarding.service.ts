import { Injectable, Logger } from '@nestjs/common';
import { type Prisma, ResumeTemplate } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { normalizeTemplateSelection } from '@/shared-kernel';
import type { OnboardingData } from '../schemas/onboarding.schema';

// Valid template values from Prisma enum
const VALID_TEMPLATES = Object.values(ResumeTemplate);
const DEFAULT_TEMPLATE = ResumeTemplate.PROFESSIONAL;

@Injectable()
export class ResumeOnboardingService {
  private readonly logger = new Logger(ResumeOnboardingService.name);

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

    const resume = await tx.resume.upsert({
      where: { id: existingResume?.id ?? 'nonexistent' },
      update: resumeData,
      create: { userId, ...resumeData },
    });

    // Set as primary resume if it's the first one created during onboarding
    if (isFirstResume) {
      await tx.user.update({
        where: { id: userId },
        data: { primaryResumeId: resume.id },
      });
      this.logger.log(`Set resume ${resume.id} as primary for user ${userId}`);
    }

    this.logger.log(`Resume upserted: ${resume.id}`);
    return resume;
  }
}
