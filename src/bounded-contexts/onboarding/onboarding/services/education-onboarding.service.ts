import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { toUTCDate } from '@/bounded-contexts/platform/common/utils/date.utils';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { BaseOnboardingService } from './base-onboarding.service';
import { ResumeSectionOnboardingService } from './resume-section-onboarding.service';

type EducationInput = OnboardingData['education'][number];
type EducationContent = Prisma.InputJsonValue;

@Injectable()
export class EducationOnboardingService extends BaseOnboardingService<
  EducationInput,
  EducationContent
> {
  private static readonly SECTION_TYPE_KEY = 'education_v1';
  protected readonly logger = new Logger(EducationOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeSectionService: ResumeSectionOnboardingService,
  ) {
    super();
  }

  async saveEducation(resumeId: string, data: OnboardingData) {
    return this.saveEducationWithTx(this.prisma, resumeId, data);
  }

  async saveEducationWithTx(tx: Prisma.TransactionClient, resumeId: string, data: OnboardingData) {
    return this.saveWithTransaction(tx, resumeId, data);
  }

  protected extractItems(data: OnboardingData): EducationInput[] {
    return data.education;
  }

  protected getNoDataFlag(data: OnboardingData): boolean {
    return data.noEducation;
  }

  protected getSkipMessage(noDataFlag: boolean | null): string {
    return noDataFlag ? 'User selected noEducation' : 'No education provided';
  }

  protected async deleteExisting(tx: Prisma.TransactionClient, resumeId: string): Promise<void> {
    await this.resumeSectionService.replaceSectionItems(tx, {
      resumeId,
      sectionTypeKey: EducationOnboardingService.SECTION_TYPE_KEY,
      items: [],
    });
  }

  protected transformItems(items: EducationInput[], _resumeId: string): EducationContent[] {
    return items
      .map((edu) => this.mapEducation(edu))
      .filter((e): e is EducationContent => e !== null);
  }

  private mapEducation(edu: EducationInput): EducationContent | null {
    const startDate = toUTCDate(edu.startDate);
    const endDate = edu.isCurrent ? null : toUTCDate(edu.endDate);

    if (!startDate) {
      this.logger.warn(`Skipping education with invalid start date: ${edu.institution}`);
      return null;
    }

    if (endDate && endDate < startDate) {
      this.logger.warn(`Skipping education with end date before start date: ${edu.institution}`);
      return null;
    }

    return {
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      isCurrent: edu.isCurrent,
    };
  }

  protected async createMany(
    tx: Prisma.TransactionClient,
    items: EducationContent[],
    resumeId: string,
  ): Promise<void> {
    await this.resumeSectionService.replaceSectionItems(tx, {
      resumeId,
      sectionTypeKey: EducationOnboardingService.SECTION_TYPE_KEY,
      items,
    });
  }

  protected getSuccessMessage(count: number): string {
    return `Created ${count} education entries`;
  }
}
