import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';

import type { Prisma } from '@prisma/client';

@Injectable()
export class LanguagesOnboardingService {
  private readonly logger = new Logger(LanguagesOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveLanguages(resumeId: string, data: OnboardingData) {
    return this.saveLanguagesWithTx(this.prisma, resumeId, data);
  }

  async saveLanguagesWithTx(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ) {
    const { languages } = data;

    if (!languages?.length) {
      this.logger.log('No languages provided');
      return;
    }

    await tx.language.deleteMany({ where: { resumeId } });

    await tx.language.createMany({
      data: languages.map((lang, index) => ({
        resumeId,
        name: lang.name,
        level: lang.level,
        order: index,
      })),
    });

    this.logger.log(`Created ${languages.length} languages`);
  }
}
