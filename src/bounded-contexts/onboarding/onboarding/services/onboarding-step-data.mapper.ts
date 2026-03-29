import {
  getSectionTypeFromStep,
  isSectionStep,
  type SectionStep,
} from '../config/onboarding-steps.config';
import type { OnboardingProgressData } from './onboarding-progress/ports/onboarding-progress.port';

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
    update: Record<string, unknown>,
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
    update: Record<string, unknown>,
    step: SectionStep,
    stepData: Record<string, unknown>,
    progress: OnboardingProgressData,
  ): void {
    const sectionTypeKey = getSectionTypeFromStep(step);
    const existingSections = progress.sections ?? [];
    const otherSections = existingSections.filter((s) => s.sectionTypeKey !== sectionTypeKey);

    update.sections = [
      ...otherSections,
      { sectionTypeKey, items: stepData.items ?? [], noData: stepData.noData ?? false },
    ];
  }

  private mergeStaticStepData(
    update: Record<string, unknown>,
    currentStep: string,
    stepData: Record<string, unknown>,
  ): void {
    const extractors: Record<string, () => unknown> = {
      'personal-info': () =>
        this.extractObjectOrRoot(stepData, 'personalInfo', this.personalInfoKeys),
      username: () => this.extractString(stepData, 'username'),
      'professional-profile': () =>
        this.extractObjectOrRoot(stepData, 'professionalProfile', this.professionalProfileKeys),
      template: () =>
        this.extractObjectOrRoot(stepData, 'templateSelection', this.templateSelectionKeys),
    };

    const extractor = extractors[currentStep];
    if (!extractor) return;

    const fieldMap: Record<string, string> = {
      'personal-info': 'personalInfo',
      username: 'username',
      'professional-profile': 'professionalProfile',
      template: 'templateSelection',
    };

    const value = extractor();
    if (value !== undefined) {
      update[fieldMap[currentStep]] = value;
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
