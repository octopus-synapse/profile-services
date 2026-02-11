import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { toUTCDate } from '@/bounded-contexts/platform/common/utils/date.utils';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { BaseOnboardingService } from './base-onboarding.service';

type ExperienceInput = OnboardingData['experiences'][number];
type ExperienceCreate = Prisma.ExperienceCreateManyInput;

@Injectable()
export class ExperienceOnboardingService extends BaseOnboardingService<
  ExperienceInput,
  ExperienceCreate
> {
  protected readonly logger = new Logger(ExperienceOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {
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
    await tx.experience.deleteMany({ where: { resumeId } });
  }

  protected transformItems(items: ExperienceInput[], resumeId: string): ExperienceCreate[] {
    return items
      .map((exp) => this.mapExperience(exp, resumeId))
      .filter((e): e is ExperienceCreate => e !== null);
  }

  private mapExperience(exp: ExperienceInput, resumeId: string): ExperienceCreate | null {
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
  }

  protected async createMany(
    tx: Prisma.TransactionClient,
    items: ExperienceCreate[],
  ): Promise<void> {
    await tx.experience.createMany({ data: items });
  }

  protected getSuccessMessage(count: number): string {
    return `Created ${count} experiences`;
  }
}
