import { z } from 'zod';
import { SocialUrlSchema } from '@/shared-kernel/schemas/primitives';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const CreatePostSchema = z
  .object({
    content: z.string().max(5000).optional(),
    imageUrl: SocialUrlSchema.optional(),
    linkUrl: SocialUrlSchema.optional(),
    scheduledAt: IsoDateTimeSchema.optional(),
    threadId: z.string().uuid().optional(),
    // Poll attachment — optional. `pollOptions` is an array of { label }.
    pollOptions: z
      .array(z.object({ label: z.string().min(1).max(80) }))
      .min(2)
      .max(4)
      .optional(),
    pollDeadline: IsoDateTimeSchema.optional(),
    // Code snippet attachment — optional. Stored as text + language label.
    codeSnippet: z.string().max(20000).optional(),
    codeLanguage: z.string().max(40).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.imageUrl && data.codeSnippet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codeSnippet'],
        message: 'image and code snippet cannot be attached to the same post',
      });
    }
    if (data.pollDeadline && !data.pollOptions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pollDeadline'],
        message: 'pollDeadline requires pollOptions',
      });
    }
    if (data.codeLanguage && !data.codeSnippet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codeLanguage'],
        message: 'codeLanguage requires codeSnippet',
      });
    }
  })
  .openapi({
    example: {
      content: 'Just shipped my first open-source library! Took 3 weeks of nights and weekends.',
    },
  });

export type CreatePostDto = z.infer<typeof CreatePostSchema>;
