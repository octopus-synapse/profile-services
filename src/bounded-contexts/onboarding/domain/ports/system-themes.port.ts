/**
 * System Themes Port
 *
 * Abstraction for fetching system themes needed by onboarding.
 */

import type { OnboardingThemeOption } from '../config/onboarding-steps.config';

export abstract class SystemThemesPort {
  abstract getSystemThemes(): Promise<OnboardingThemeOption[]>;
}
