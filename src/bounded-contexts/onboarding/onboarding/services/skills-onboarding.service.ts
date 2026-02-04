import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { BaseOnboardingService } from './base-onboarding.service';

type SkillInput = OnboardingData['skills'][number];
type SkillCreate = Prisma.SkillCreateManyInput;

@Injectable()
export class SkillsOnboardingService extends BaseOnboardingService<
  SkillInput,
  SkillCreate
> {
  protected readonly logger = new Logger(SkillsOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async saveSkills(resumeId: string, data: OnboardingData) {
    return this.saveSkillsWithTx(this.prisma, resumeId, data);
  }

  async saveSkillsWithTx(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ) {
    return this.saveWithTransaction(tx, resumeId, data);
  }

  protected extractItems(data: OnboardingData): SkillInput[] {
    return data.skills;
  }

  protected getNoDataFlag(data: OnboardingData): boolean {
    return data.noSkills;
  }

  protected getSkipMessage(noDataFlag: boolean | null): string {
    return noDataFlag ? 'User selected noSkills' : 'No skills provided';
  }

  protected async deleteExisting(
    tx: Prisma.TransactionClient,
    resumeId: string,
  ): Promise<void> {
    await tx.skill.deleteMany({ where: { resumeId } });
  }

  protected transformItems(
    items: SkillInput[],
    resumeId: string,
  ): SkillCreate[] {
    return items.map((skill, index) => ({
      resumeId,
      name: skill.name,
      category: skill.category ?? '',
      level: null,
      order: index,
    }));
  }

  protected async createMany(
    tx: Prisma.TransactionClient,
    items: SkillCreate[],
  ): Promise<void> {
    await tx.skill.createMany({ data: items });
  }

  protected getSuccessMessage(count: number): string {
    return `Created ${count} skills`;
  }
}
