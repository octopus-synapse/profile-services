import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';
import { DateUtils } from '../../common/utils/date.utils';

@Injectable()
export class EducationOnboardingService {
  private readonly logger = new Logger(EducationOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveEducation(resumeId: string, data: OnboardingData) {
    const { educationStep } = data;

    if (
      !educationStep ||
      educationStep.noEducation ||
      !educationStep.education?.length
    ) {
      this.logger.log(
        educationStep?.noEducation
          ? 'User selected noEducation'
          : 'No education provided',
      );
      return;
    }

    await this.prisma.education.deleteMany({ where: { resumeId } });

    const validEducation = educationStep.education
      .map((edu) => {
        const startDate = DateUtils.toUTCDate(edu.startDate);
        const endDate = edu.isCurrent ? null : DateUtils.toUTCDate(edu.endDate);

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
          field: edu.field,
          startDate,
          endDate,
          isCurrent: edu.isCurrent,
        };
      })
      .filter(Boolean);

    if (validEducation.length > 0) {
      const filteredEducation = validEducation.filter(
        (e): e is NonNullable<typeof e> => e !== null,
      );
      await this.prisma.education.createMany({
        data: filteredEducation,
      });
      this.logger.log(`Created ${validEducation.length} education entries`);
    }
  }
}
