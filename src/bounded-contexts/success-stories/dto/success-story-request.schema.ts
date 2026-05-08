import { z } from 'zod';

export const CreateSuccessStorySchema = z
  .object({
    userId: z.string().min(1),
    headline: z.string().min(1).max(200),
    beforeText: z.string().min(1).max(500),
    afterText: z.string().min(1).max(500),
    quote: z.string().min(1).max(500),
    timeframeDays: z.number().int().min(0).max(3650).optional(),
    weight: z.number().int().optional(),
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  })
  .openapi({
    example: {
      userId: '01900000-0000-7000-a000-000000000001',
      headline: 'From bootcamp grad to senior engineer in 18 months',
      beforeText: 'Self-taught developer struggling to land first role.',
      afterText: 'Senior backend engineer at a Series B startup.',
      quote: 'Patch Careers helped me focus my resume on what hiring managers actually care about.',
      timeframeDays: 540,
      status: 'PUBLISHED',
    },
  });
export const UpdateSuccessStorySchema = CreateSuccessStorySchema.partial()
  .omit({ userId: true })
  .openapi({
    example: {
      headline: 'From bootcamp grad to staff engineer in two years',
      status: 'PUBLISHED',
    },
  });

export type CreateSuccessStoryDto = z.infer<typeof CreateSuccessStorySchema>;

export type UpdateSuccessStoryDto = z.infer<typeof UpdateSuccessStorySchema>;
