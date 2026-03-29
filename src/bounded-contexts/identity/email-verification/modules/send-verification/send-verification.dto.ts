/**
 * Send Verification Email DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendVerificationEmailResponseSchema = z.object({
  message: z.string(),
});

export class SendVerificationEmailResponseDto extends createZodDto(
  SendVerificationEmailResponseSchema,
) {}
