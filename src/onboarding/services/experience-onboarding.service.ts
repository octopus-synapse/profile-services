import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';
import { DateUtils } from '../../common/utils/date.utils';

@Injectable()
export class ExperienceOnboardingService {
  private readonly logger = new Logger(ExperienceOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveExperiences(resumeId: string, data: OnboardingData) {
    const { experiencesStep } = data;

    if (
      !experiencesStep ||
      experiencesStep.noExperience ||
      !experiencesStep.experiences?.length
    ) {
      this.logger.log(
        experiencesStep?.noExperience
          ? 'User selected noExperience'
          : 'No experiences provided',
      );
      return;
    }

    await this.prisma.experience.deleteMany({ where: { resumeId } });

    const validExperiences = experiencesStep.experiences
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
          description: exp.description,
          location: exp.location,
          skills: [],
          order: 0,
        };
      })
      .filter(Boolean);

    if (validExperiences.length > 0) {
      const filteredExperiences = validExperiences.filter(
        (e): e is NonNullable<typeof e> => e !== null,
      );
      await this.prisma.experience.createMany({
        data: filteredExperiences,
      });
      this.logger.log(`Created ${validExperiences.length} experiences`);
    }
  }
}
