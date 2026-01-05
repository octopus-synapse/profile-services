import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';
import { DateUtils } from '../../common/utils/date.utils';

import type { Prisma } from '@prisma/client';

@Injectable()
export class EducationOnboardingService {
  private readonly logger = new Logger(EducationOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveEducation(resumeId: string, data: OnboardingData) {
    return this.saveEducationWithTx(this.prisma, resumeId, data);
  }

  async saveEducationWithTx(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ) {
    const { education, noEducation } = data;

    if (noEducation || !education?.length) {
      this.logger.log(
        noEducation ? 'User selected noEducation' : 'No education provided',
      );
      return;
    }

    await tx.education.deleteMany({ where: { resumeId } });

    const validEducation = education
      .map((edu) => {
        const startDate = DateUtils.toUTCDate(edu.startDate);
        const endDate = edu.current ? null : DateUtils.toUTCDate(edu.endDate);

        if (!startDate) {
          this.logger.warn(
            `Skipping education with invalid start date: ${edu.institution}`,
          );
          return null;
        }

        // Validate endDate is after startDate
        if (endDate && endDate < startDate) {
          this.logger.warn(
            `Skipping education with end date before start date: ${edu.institution}`,
          );
          return null;
        }

        return {
          resumeId,
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field ?? '',
          startDate,
          endDate,
          isCurrent: edu.current ?? false,
        };
      })
      .filter(Boolean);

    if (validEducation.length > 0) {
      const filteredEducation = validEducation.filter(
        (e): e is NonNullable<typeof e> => e !== null,
      );
      await tx.education.createMany({
        data: filteredEducation,
      });
      this.logger.log(`Created ${validEducation.length} education entries`);
    }
  }
}
