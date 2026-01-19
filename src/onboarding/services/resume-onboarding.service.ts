import { Injectable, Logger } from '@nestjs/common';
import { OnboardingRepository } from '../repositories';
import type { OnboardingData } from '../schemas/onboarding.schema';

import type { Prisma, ResumeTemplate } from '@prisma/client';

@Injectable()
export class ResumeOnboardingService {
  private readonly logger = new Logger(ResumeOnboardingService.name);

  constructor(private readonly repository: OnboardingRepository) {}

  async upsertResume(userId: string, data: OnboardingData) {
    return this.upsertResumeWithTx(this.repository.getClient(), userId, data);
  }

  async upsertResumeWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    data: OnboardingData,
  ) {
    const { personalInfo, professionalProfile, templateSelection } = data;

    const existingResume = await this.repository.findFirstResumeByUserId(
      tx,
      userId,
    );

    const isFirstResume = !existingResume;

    const resume = await this.repository.upsertResume(
      tx,
      existingResume?.id ?? null,
      userId,
      {
        fullName: personalInfo.fullName,
        emailContact: personalInfo.email,
        phone: personalInfo.phone,
        location: personalInfo.location,
        jobTitle: professionalProfile.jobTitle,
        summary: professionalProfile.summary,
        linkedin: professionalProfile.linkedin,
        github: professionalProfile.github,
        website: professionalProfile.website,
        template: templateSelection.template as ResumeTemplate,
      },
    );

    // Set as primary resume if it's the first one created during onboarding
    if (isFirstResume) {
      await this.repository.setUserPrimaryResume(tx, userId, resume.id);
      this.logger.log(`Set resume ${resume.id} as primary for user ${userId}`);
    }

    this.logger.log(`Resume upserted: ${resume.id}`);
    return resume;
  }
}
