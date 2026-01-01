import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';

import type { Prisma } from '@prisma/client';

@Injectable()
export class ResumeOnboardingService {
  private readonly logger = new Logger(ResumeOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertResume(userId: string, data: OnboardingData) {
    return this.upsertResumeWithTx(this.prisma, userId, data);
  }

  async upsertResumeWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    data: OnboardingData,
  ) {
    const { personalInfo, professionalProfile, templateSelection } = data;

    const existingResume = await tx.resume.findFirst({
      where: { userId },
    });

    const resume = await tx.resume.upsert({
      where: { id: existingResume?.id ?? 'nonexistent' },
      update: {
        fullName: personalInfo.fullName,
        emailContact: personalInfo.email,
        phone: personalInfo.phone,
        location: personalInfo.location,
        jobTitle: professionalProfile.jobTitle,
        summary: professionalProfile.summary,
        linkedin: professionalProfile.linkedin,
        github: professionalProfile.github,
        website: professionalProfile.website,
        template: templateSelection.template,
      },
      create: {
        userId,
        fullName: personalInfo.fullName,
        emailContact: personalInfo.email,
        phone: personalInfo.phone,
        location: personalInfo.location,
        jobTitle: professionalProfile.jobTitle,
        summary: professionalProfile.summary,
        linkedin: professionalProfile.linkedin,
        github: professionalProfile.github,
        website: professionalProfile.website,
        template: templateSelection.template,
      },
    });

    this.logger.log(`Resume upserted: ${resume.id}`);
    return resume;
  }
}
