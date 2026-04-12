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
  type OnboardingStepField,
  type OnboardingStepTranslation,
  type OnboardingStepValidation,
  type StrengthConfig,
  type StrengthLevel,
} from '../../domain/ports/onboarding-config.port';

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

    return rows.map((row) => {
      const fields = Array.isArray(row.fields) ? row.fields : [];
      const translations =
        row.translations && typeof row.translations === 'object' ? row.translations : {};
      const validation = row.validation && typeof row.validation === 'object' ? row.validation : {};

      return {
        key: row.key,
        order: row.order,
        component: row.component,
        icon: row.icon,
        required: row.required,
        sectionTypeKey: row.sectionTypeKey,
        fields: fields as never as OnboardingStepField[],
        translations: translations as never as Record<string, OnboardingStepTranslation>,
        validation: validation as never as OnboardingStepValidation,
        strengthWeight: row.strengthWeight,
      };
    });
  }

  async getStrengthConfig(): Promise<StrengthConfig> {
    const config = await this.prisma.onboardingConfig.findUnique({
      where: { key: 'default' },
    });

    return {
      levels: (config?.strengthLevels as never as StrengthLevel[]) ?? [],
    };
  }
}
