import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { DateUtils } from '../../common/utils/date.utils';

import type { Prisma } from '@prisma/client';

@Injectable()
export class ExperienceOnboardingService {
  private readonly logger = new Logger(ExperienceOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveExperiences(resumeId: string, data: OnboardingData) {
    return this.saveExperiencesWithTx(this.prisma, resumeId, data);
  }

  async saveExperiencesWithTx(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ) {
    const { experiences, noExperience } = data;

    if (noExperience || !experiences.length) {
      this.logger.log(
        noExperience ? 'User selected noExperience' : 'No experiences provided',
      );
      return;
    }

    await tx.experience.deleteMany({ where: { resumeId } });

    const validExperiences = experiences
      .map((exp) => {
        const startDate = DateUtils.toUTCDate(exp.startDate);
        const endDate = exp.isCurrent ? null : DateUtils.toUTCDate(exp.endDate);

        if (!startDate) {
          this.logger.warn(
            `Skipping experience with invalid start date: ${exp.company}`,
          );
          return null;
        }

        // Validate endDate is after startDate
        if (endDate && endDate < startDate) {
          this.logger.warn(
            `Skipping experience with end date before start date: ${exp.company}`,
          );
          return null;
        }

        return {
          resumeId,
          company: exp.company,
          position: exp.position,
          startDate,
          endDate,
          isCurrent: exp.isCurrent,
          description: exp.description ?? '',
          location: '',
          skills: [],
          order: 0,
        };
      })
      .filter(Boolean);

    if (validExperiences.length > 0) {
      const filteredExperiences = validExperiences.filter(
        (e): e is NonNullable<typeof e> => e !== null,
      );
      await tx.experience.createMany({
        data: filteredExperiences,
      });
      this.logger.log(`Created ${validExperiences.length} experiences`);
    }
  }
}
