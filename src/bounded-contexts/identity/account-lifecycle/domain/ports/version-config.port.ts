/**
 * Version Config Port (Outbound)
 *
 * Provides current versions of legal documents
 */

export abstract class VersionConfigPort {
  abstract getTosVersion(): string;
  abstract getPrivacyPolicyVersion(): string;
  abstract getMarketingConsentVersion(): string;
}
