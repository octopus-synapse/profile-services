/**
 * Version Config Port (Outbound)
 *
 * Provides current versions of legal documents
 */

export const VERSION_CONFIG_PORT = Symbol('VersionConfigPort');

export interface VersionConfigPort {
  getTosVersion(): string;
  getPrivacyPolicyVersion(): string;
  getMarketingConsentVersion(): string;
}
