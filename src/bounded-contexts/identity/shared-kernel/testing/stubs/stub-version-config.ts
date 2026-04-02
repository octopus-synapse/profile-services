/**
 * Stub Version Config
 *
 * Simple stub for version configuration in tests.
 * Allows setting custom versions for different document types.
 */

import type { VersionConfigPort } from '../../../account-lifecycle/domain/ports/version-config.port';

export class StubVersionConfig implements VersionConfigPort {
  constructor(
    private readonly tosVersion: string = '1.0.0',
    private readonly privacyPolicyVersion: string = '1.0.0',
    private readonly marketingConsentVersion: string = '1.0.0',
  ) {}

  getTosVersion(): string {
    return this.tosVersion;
  }

  getPrivacyPolicyVersion(): string {
    return this.privacyPolicyVersion;
  }

  getMarketingConsentVersion(): string {
    return this.marketingConsentVersion;
  }

  // Factory for common scenarios
  static withVersions(tos: string, privacy: string, marketing: string): StubVersionConfig {
    return new StubVersionConfig(tos, privacy, marketing);
  }

  static default(): StubVersionConfig {
    return new StubVersionConfig();
  }
}
