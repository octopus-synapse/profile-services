import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { OnboardingRepository } from '../repositories';
import { DateUtils } from '../../common/utils/date.utils';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { BaseOnboardingService } from './base-onboarding.service';

type EducationInput = OnboardingData['education'][number];
type EducationCreate = Prisma.EducationCreateManyInput;

@Injectable()
export class EducationOnboardingService extends BaseOnboardingService<
  EducationInput,
  EducationCreate
> {
  protected readonly logger = new Logger(EducationOnboardingService.name);

  constructor(private readonly repository: OnboardingRepository) {
    super();
  }

  async saveEducation(resumeId: string, data: OnboardingData) {
    return this.saveEducationWithTx(
      this.repository.getClient(),
      resumeId,
      data,
    );
  }

  async saveEducationWithTx(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ) {
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

  protected async deleteExisting(
    tx: Prisma.TransactionClient,
    resumeId: string,
  ): Promise<void> {
    await this.repository.deleteEducationByResumeId(tx, resumeId);
  }

  protected transformItems(
    items: EducationInput[],
    resumeId: string,
  ): EducationCreate[] {
    return items
      .map((edu) => this.mapEducation(edu, resumeId))
      .filter((e): e is EducationCreate => e !== null);
  }

  private mapEducation(
    edu: EducationInput,
    resumeId: string,
  ): EducationCreate | null {
    const startDate = DateUtils.toUTCDate(edu.startDate);
    const endDate = edu.isCurrent ? null : DateUtils.toUTCDate(edu.endDate);

    if (!startDate) {
      this.logger.warn(
        `Skipping education with invalid start date: ${edu.institution}`,
      );
      return null;
    }

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
  }

  protected async createMany(
    tx: Prisma.TransactionClient,
    items: EducationCreate[],
  ): Promise<void> {
    await this.repository.createManyEducation(tx, items);
  }

  protected getSuccessMessage(count: number): string {
    return `Created ${count} education entries`;
  }
}
