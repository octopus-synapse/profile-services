/**
 * Get Consent Status DTO
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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

// Response DTO for Swagger
const ConsentStatusResponseSchema = z.object({
  tosAccepted: z.boolean(),
  privacyPolicyAccepted: z.boolean(),
  marketingConsentAccepted: z.boolean(),
  latestTosVersion: z.string(),
  latestPrivacyPolicyVersion: z.string(),
});

export class ConsentStatusResponseDto extends createZodDto(ConsentStatusResponseSchema) {}
