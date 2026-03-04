/**
 * Get Consent Status DTO
 */

export interface GetConsentStatusInput {
  userId: string;
}

export interface GetConsentStatusOutput {
  tosAccepted: boolean;
  privacyPolicyAccepted: boolean;
  marketingConsentAccepted: boolean;
  latestTosVersion: string;
  latestPrivacyPolicyVersion: string;
}
