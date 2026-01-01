import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';

import type { Prisma } from '@prisma/client';

@Injectable()
export class SkillsOnboardingService {
  private readonly logger = new Logger(SkillsOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveSkills(resumeId: string, data: OnboardingData) {
    return this.saveSkillsWithTx(this.prisma, resumeId, data);
  }

  async saveSkillsWithTx(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ) {
    const { skillsStep } = data;

    if (skillsStep.noSkills || !skillsStep.skills?.length) {
      this.logger.log(
        skillsStep.noSkills ? 'User selected noSkills' : 'No skills provided',
      );
      return;
    }

    await tx.skill.deleteMany({ where: { resumeId } });

    await tx.skill.createMany({
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
