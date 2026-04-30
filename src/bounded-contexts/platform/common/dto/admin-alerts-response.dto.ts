import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AdminAlertsDataSchema = z.object({
  reportsPending: z.number().int(),
  usersPendingVerification: z.number().int(),
  shadowProfilesStale: z.number().int(),
  total: z.number().int(),
});

export class AdminAlertsDataDto extends createZodDto(AdminAlertsDataSchema) {}
