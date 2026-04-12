import {
  getSectionTypeFromStep,
  isSectionStep,
  type SectionStep,
} from '../../../domain/config/onboarding-steps.config';
import type {
  OnboardingProgressData,
  SectionProgressData,
} from '../../../domain/ports/onboarding-progress.port';

/**
 * Maps step data from frontend commands into the correct progress structure.
 * Pure data transformation — no side effects, no I/O.
 */
export class OnboardingStepDataMapper {
  private readonly personalInfoKeys = ['fullName', 'email', 'phone', 'location'] as const;
  private readonly professionalProfileKeys = [
    'jobTitle',
    'summary',
    'linkedin',
    'github',
    'website',
  ] as const;
  private readonly templateSelectionKeys = [
    'templateId',
    'colorScheme',
    'template',
    'palette',
  ] as const;

  mergeStepData(
    update: OnboardingProgressData,
    currentStep: string,
    stepData: Record<string, unknown>,
    progress: OnboardingProgressData,
  ): void {
    if (isSectionStep(currentStep)) {
      this.mergeSectionData(update, currentStep as SectionStep, stepData, progress);
      return;
    }

    this.mergeStaticStepData(update, currentStep, stepData);
  }

  private mergeSectionData(
    update: OnboardingProgressData,
    step: SectionStep,
    stepData: Record<string, unknown>,
    progress: OnboardingProgressData,
  ): void {
    const sectionTypeKey = getSectionTypeFromStep(step);
    const existingSections = progress.sections ?? [];
    const otherSections = existingSections.filter((s) => s.sectionTypeKey !== sectionTypeKey);

    const newSection: SectionProgressData = {
      sectionTypeKey,
      items: Array.isArray(stepData.items) ? stepData.items : [],
      noData: typeof stepData.noData === 'boolean' ? stepData.noData : false,
    };

    update.sections = [...otherSections, newSection];
  }

  private mergeStaticStepData(
    update: OnboardingProgressData,
    currentStep: string,
    stepData: Record<string, unknown>,
  ): void {
    switch (currentStep) {
      case 'personal-info': {
        const value = this.extractObjectOrRoot(stepData, 'personalInfo', this.personalInfoKeys);
        if (value !== undefined) update.personalInfo = value;
        break;
      }
      case 'username': {
        const value = this.extractString(stepData, 'username');
        if (value !== undefined) update.username = value;
        break;
      }
      case 'professional-profile': {
        const value = this.extractObjectOrRoot(
          stepData,
          'professionalProfile',
          this.professionalProfileKeys,
        );
        if (value !== undefined) update.professionalProfile = value;
        break;
      }
      case 'template': {
        const value = this.extractObjectOrRoot(
          stepData,
          'templateSelection',
          this.templateSelectionKeys,
        );
        if (value !== undefined) update.templateSelection = value;
        break;
      }
    }
  }

  private extractObject(
    data: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> | undefined {
    const value = data[key];
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return undefined;
  }

  private extractObjectOrRoot(
    data: Record<string, unknown>,
    key: string,
    rootKeys: readonly string[],
  ): Record<string, unknown> | undefined {
    return this.extractObject(data, key) ?? this.pickDefinedProperties(data, rootKeys);
  }

  private pickDefinedProperties(
    data: Record<string, unknown>,
    keys: readonly string[],
  ): Record<string, unknown> | undefined {
    const entries = keys.flatMap((key) => (data[key] === undefined ? [] : [[key, data[key]]]));
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  private extractString(data: Record<string, unknown>, key: string): string | undefined {
    if (typeof data[key] === 'string') {
      return data[key];
    }
    return undefined;
  }
}
