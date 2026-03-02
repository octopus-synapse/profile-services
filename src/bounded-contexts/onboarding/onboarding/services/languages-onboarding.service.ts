import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingData } from '../schemas/onboarding.schema';
import { BaseOnboardingService } from './base-onboarding.service';
import { ResumeSectionOnboardingService } from './resume-section-onboarding.service';

type LanguageInput = OnboardingData['languages'][number];
type LanguageContent = Prisma.InputJsonValue;

@Injectable()
export class LanguagesOnboardingService extends BaseOnboardingService<
  LanguageInput,
  LanguageContent
> {
  private static readonly SECTION_TYPE_KEY = 'language_v1';
  protected readonly logger = new Logger(LanguagesOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeSectionService: ResumeSectionOnboardingService,
  ) {
    super();
  }

  async saveLanguages(resumeId: string, data: OnboardingData) {
    return this.saveLanguagesWithTx(this.prisma, resumeId, data);
  }

  async saveLanguagesWithTx(tx: Prisma.TransactionClient, resumeId: string, data: OnboardingData) {
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

  protected async deleteExisting(tx: Prisma.TransactionClient, resumeId: string): Promise<void> {
    await this.resumeSectionService.replaceSectionItems(tx, {
      resumeId,
      sectionTypeKey: LanguagesOnboardingService.SECTION_TYPE_KEY,
      items: [],
    });
  }

  protected transformItems(items: LanguageInput[], _resumeId: string): LanguageContent[] {
    return items.map((lang) => ({
      name: lang.name,
      level: lang.level,
    }));
  }

  protected async createMany(
    tx: Prisma.TransactionClient,
    items: LanguageContent[],
    resumeId: string,
  ): Promise<void> {
    await this.resumeSectionService.replaceSectionItems(tx, {
      resumeId,
      sectionTypeKey: LanguagesOnboardingService.SECTION_TYPE_KEY,
      items,
    });
  }

  protected getSuccessMessage(count: number): string {
    return `Created ${count} languages`;
  }
}
