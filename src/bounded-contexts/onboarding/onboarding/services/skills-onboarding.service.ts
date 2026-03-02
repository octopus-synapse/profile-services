import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { BaseOnboardingService } from './base-onboarding.service';
import { ResumeSectionOnboardingService } from './resume-section-onboarding.service';

type SkillInput = OnboardingData['skills'][number];
type SkillContent = Prisma.InputJsonValue;

@Injectable()
export class SkillsOnboardingService extends BaseOnboardingService<SkillInput, SkillContent> {
  private static readonly SECTION_TYPE_KEY = 'skill_set_v1';
  protected readonly logger = new Logger(SkillsOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeSectionService: ResumeSectionOnboardingService,
  ) {
    super();
  }

  async saveSkills(resumeId: string, data: OnboardingData) {
    return this.saveSkillsWithTx(this.prisma, resumeId, data);
  }

  async saveSkillsWithTx(tx: Prisma.TransactionClient, resumeId: string, data: OnboardingData) {
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

  protected async deleteExisting(tx: Prisma.TransactionClient, resumeId: string): Promise<void> {
    await this.resumeSectionService.replaceSectionItems(tx, {
      resumeId,
      sectionTypeKey: SkillsOnboardingService.SECTION_TYPE_KEY,
      items: [],
    });
  }

  protected transformItems(items: SkillInput[], _resumeId: string): SkillContent[] {
    return items.map((skill) => ({
      name: skill.name,
      category: skill.category ?? '',
    }));
  }

  protected async createMany(
    tx: Prisma.TransactionClient,
    items: SkillContent[],
    resumeId: string,
  ): Promise<void> {
    await this.resumeSectionService.replaceSectionItems(tx, {
      resumeId,
      sectionTypeKey: SkillsOnboardingService.SECTION_TYPE_KEY,
      items,
    });
  }

  protected getSuccessMessage(count: number): string {
    return `Created ${count} skills`;
  }
}
