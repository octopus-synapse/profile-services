import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingData } from '../schemas/onboarding.schema';

@Injectable()
export class LanguagesOnboardingService {
  private readonly logger = new Logger(LanguagesOnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveLanguages(resumeId: string, data: OnboardingData) {
    const { languages } = data;

    if (!languages?.length) {
      this.logger.log('No languages provided');
      return;
    }

    await this.prisma.language.deleteMany({ where: { resumeId } });

    await this.prisma.language.createMany({
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
