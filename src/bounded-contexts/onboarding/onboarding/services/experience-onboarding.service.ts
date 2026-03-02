import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { toUTCDate } from '@/bounded-contexts/platform/common/utils/date.utils';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { BaseOnboardingService } from './base-onboarding.service';
import { ResumeSectionOnboardingService } from './resume-section-onboarding.service';

type ExperienceInput = OnboardingData['experiences'][number];
type ExperienceContent = Prisma.InputJsonValue;

@Injectable()
export class ExperienceOnboardingService extends BaseOnboardingService<
  ExperienceInput,
  ExperienceContent
> {
  private static readonly SECTION_TYPE_KEY = 'work_experience_v1';
  protected readonly logger = new Logger(ExperienceOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeSectionService: ResumeSectionOnboardingService,
  ) {
    super();
  }

  async saveExperiences(resumeId: string, data: OnboardingData) {
    return this.saveExperiencesWithTx(this.prisma, resumeId, data);
  }

  async saveExperiencesWithTx(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ) {
    return this.saveWithTransaction(tx, resumeId, data);
  }

  protected extractItems(data: OnboardingData): ExperienceInput[] {
    return data.experiences;
  }

  protected getNoDataFlag(data: OnboardingData): boolean {
    return data.noExperience;
  }

  protected getSkipMessage(noDataFlag: boolean | null): string {
    return noDataFlag ? 'User selected noExperience' : 'No experiences provided';
  }

  protected async deleteExisting(tx: Prisma.TransactionClient, resumeId: string): Promise<void> {
    await this.resumeSectionService.replaceSectionItems(tx, {
      resumeId,
      sectionTypeKey: ExperienceOnboardingService.SECTION_TYPE_KEY,
      items: [],
    });
  }

  protected transformItems(items: ExperienceInput[], _resumeId: string): ExperienceContent[] {
    return items
      .map((exp) => this.mapExperience(exp))
      .filter((e): e is ExperienceContent => e !== null);
  }

  private mapExperience(exp: ExperienceInput): ExperienceContent | null {
    const startDate = toUTCDate(exp.startDate);
    const endDate = exp.isCurrent ? null : toUTCDate(exp.endDate);

    if (!startDate) {
      this.logger.warn(`Skipping experience with invalid start date: ${exp.company}`);
      return null;
    }

    if (endDate && endDate < startDate) {
      this.logger.warn(`Skipping experience with end date before start date: ${exp.company}`);
      return null;
    }

    return {
      company: exp.company,
      role: exp.position,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : null,
      isCurrent: exp.isCurrent,
      description: exp.description ?? '',
    };
  }

  protected async createMany(
    tx: Prisma.TransactionClient,
    items: ExperienceContent[],
    resumeId: string,
  ): Promise<void> {
    await this.resumeSectionService.replaceSectionItems(tx, {
      resumeId,
      sectionTypeKey: ExperienceOnboardingService.SECTION_TYPE_KEY,
      items,
    });
  }

  protected getSuccessMessage(count: number): string {
    return `Created ${count} experiences`;
  }
}
