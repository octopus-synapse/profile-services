import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { BaseOnboardingService } from './base-onboarding.service';

type LanguageInput = OnboardingData['languages'][number];
type LanguageCreate = Prisma.LanguageCreateManyInput;

@Injectable()
export class LanguagesOnboardingService extends BaseOnboardingService<
  LanguageInput,
  LanguageCreate
> {
  protected readonly logger = new Logger(LanguagesOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async saveLanguages(resumeId: string, data: OnboardingData) {
    return this.saveLanguagesWithTx(this.prisma, resumeId, data);
  }

  async saveLanguagesWithTx(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ) {
    return this.saveWithTransaction(tx, resumeId, data);
  }

  protected extractItems(data: OnboardingData): LanguageInput[] {
    return data.languages;
  }

  // Languages has no noData flag - return null
  protected getNoDataFlag(): null {
    return null;
  }

  protected getSkipMessage(): string {
    return 'No languages provided';
  }

  protected async deleteExisting(
    tx: Prisma.TransactionClient,
    resumeId: string,
  ): Promise<void> {
    await tx.language.deleteMany({ where: { resumeId } });
  }

  protected transformItems(items: LanguageInput[], resumeId: string): LanguageCreate[] {
    return items.map((lang, index) => ({
      resumeId,
      name: lang.name,
      level: lang.level,
      order: index,
    }));
  }

  protected async createMany(
    tx: Prisma.TransactionClient,
    items: LanguageCreate[],
  ): Promise<void> {
    await tx.language.createMany({ data: items });
  }

  protected getSuccessMessage(count: number): string {
    return `Created ${count} languages`;
  }
}
