import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';

@Injectable()
export class SkillsOnboardingService {
  private readonly logger = new Logger(SkillsOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveSkills(resumeId: string, data: OnboardingData) {
    const { skillsStep } = data;

    if (skillsStep.noSkills || !skillsStep.skills?.length) {
      this.logger.log(
        skillsStep.noSkills ? 'User selected noSkills' : 'No skills provided',
      );
      return;
    }

    await this.prisma.skill.deleteMany({ where: { resumeId } });

    await this.prisma.skill.createMany({
      data: skillsStep.skills.map((skill, index) => ({
        resumeId,
        name: skill.name,
        category: skill.category,
        level: skill.level,
        order: index,
      })),
    });

    this.logger.log(`Created ${skillsStep.skills.length} skills`);
  }
}
