import { PostType } from '@prisma/client';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const CreatePostSchema = z
  .object({
    type: z.nativeEnum(PostType),
    subtype: z.string().max(60).optional(),
    content: z.string().max(5000).optional(),
    hardSkills: z.array(z.string().max(60)).max(40).optional(),
    softSkills: z.array(z.string().max(60)).max(20).optional(),
    // Open-ended structured payload per post type. We use a permissive
    // passthrough object so the Zod → OpenAPI conversion emits a valid schema
    // while still allowing arbitrary keys; per-type validation is delegated
    // to the consuming service (BUILD wants previewUrl/repoUrl/stack, etc.).
    data: z.object({}).passthrough().optional(),
    imageUrl: z.string().url().optional(),
    linkUrl: z.string().url().optional(),
    originalPostId: z.string().min(1).optional(),
    coAuthors: z.array(z.string().min(1)).max(8).optional(),
    scheduledAt: IsoDateTimeSchema.optional(),
    threadId: z.string().min(1).optional(),
    codeSnippet: z
      .object({
        language: z.string().max(40),
        code: z.string().max(20000),
        filename: z.string().max(120).optional(),
      })
      .optional(),
    // Blind Mode fields. Anonymous posting is only allowed under one of the
    // five sanctioned categories (salary/interview/layoff/toxic culture/
    // harassment) so the feature doesn't become a spam vector for generic
    // content. If `isAnonymous=true`, `anonymousCategory` is required.
    isAnonymous: z.boolean().optional(),
    anonymousCategory: z
      .enum(['SALARY', 'INTERVIEW', 'LAYOFF', 'TOXIC_CULTURE', 'HARASSMENT'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isAnonymous && !data.anonymousCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['anonymousCategory'],
        message: 'anonymousCategory is required when isAnonymous is true',
      });
    }
    if (!data.isAnonymous && data.anonymousCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['anonymousCategory'],
        message: 'anonymousCategory cannot be set unless isAnonymous is true',
      });
    }
  })
  .openapi({
    example: {
      type: PostType.ACHIEVEMENT,
      content: 'Excited to share that I just shipped my first open-source library!',
      hardSkills: ['typescript', 'nodejs'],
    },
  });

export type CreatePostDto = z.infer<typeof CreatePostSchema>;
