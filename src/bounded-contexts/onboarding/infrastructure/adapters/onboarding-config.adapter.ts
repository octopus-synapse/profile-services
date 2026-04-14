/**
 * Onboarding Config Adapter
 *
 * Loads onboarding flow configuration from the database.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  OnboardingConfigPort,
  type OnboardingStepConfig,
  type StrengthConfig,
} from '../../domain/ports/onboarding-config.port';
import {
  onboardingStepFieldsSchema,
  onboardingStepTranslationsSchema,
  onboardingStepValidationArgSchema,
  strengthLevelsSchema,
} from './onboarding-config.schemas';

@Injectable()
export class OnboardingConfigAdapter extends OnboardingConfigPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getActiveSteps(): Promise<OnboardingStepConfig[]> {
    const rows = await this.prisma.onboardingStep.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    return rows.map((row) => ({
      key: row.key,
      order: row.order,
      component: row.component,
      icon: row.icon,
      required: row.required,
      sectionTypeKey: row.sectionTypeKey,
      fields: onboardingStepFieldsSchema.parse(row.fields),
      translations: onboardingStepTranslationsSchema.parse(row.translations),
      validation: onboardingStepValidationArgSchema.parse(row.validation),
      strengthWeight: row.strengthWeight,
    }));
  }

  async getStrengthConfig(): Promise<StrengthConfig> {
    const config = await this.prisma.onboardingConfig.findUnique({
      where: { key: 'default' },
    });

    return {
      levels: strengthLevelsSchema.parse(config?.strengthLevels ?? []),
    };
  }
}
