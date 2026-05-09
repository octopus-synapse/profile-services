/**
 * Route descriptors for the public-resumes BC. Replaces both the JSON
 * endpoints of `PublicResumeController` / `ShareManagementController`
 * and their binary PNG siblings.
 *
 * Binary endpoints (`/og.png`, `/qr.png`) declare static
 * `headers: { Content-Type, Cache-Control }` and return a
 * `StreamableFile` from the handler — the synthesizer's
 * `Res({ passthrough: true })` lets `StreamableFile` flow through
 * Nest's response interceptor unchanged.
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

// ─── Schemas ─────────────────────────────────────────────────────────
export const SlugParam = z.object({ slug: z.string() });
export const ResumeIdParam = z.object({ resumeId: z.string() });
export const ShareIdParam = z.object({ shareId: z.string() });
export const AliasIdParam = z.object({ aliasId: z.string() });

export const CreateShareSchema = z
  .object({
    resumeId: z.string().min(1),
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(/^[a-zA-Z0-9-]+$/, 'Slug must be alphanumeric with hyphens')
      .optional(),
    password: z.string().min(4).max(200).optional().openapi({
      description:
        'Optional share-link access password (4-200 chars). Distinct from user account password — applies only to viewers of this share link.',
    }),
    expiresAt: z.coerce.date().optional(),
  })
  .openapi({
    example: {
      resumeId: '01900000-0000-7000-a000-000000000010',
      slug: 'jane-doe-senior-engineer',
    },
  });

export const AddAliasSchema = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(/^[a-zA-Z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
  })
  .openapi({
    example: {
      slug: 'jane-doe-2026',
    },
  });

export const QrSizeSchema = z.object({
  size: z.coerce.number().int().min(64).max(1024).default(256),
});

export const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=86400',
} as const;

// ─── Response schemas ─────────────────────────────────────────────────
// Bounded-depth JSON value for free-form section item content shapes.
export const JsonLeafSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const JsonNodeLevel2Schema = z.union([
  JsonLeafSchema,
  z.array(JsonLeafSchema),
  z.record(z.string(), JsonLeafSchema),
]);
export const JsonNodeLevel1Schema = z.union([
  JsonLeafSchema,
  z.array(JsonNodeLevel2Schema),
  z.record(z.string(), JsonNodeLevel2Schema),
]);

export const PublicResumeSectionSchema = z.object({
  semanticKind: z.string(),
  items: z.array(JsonNodeLevel1Schema),
});

export const PublicResumeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  language: z.string(),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  contentPtBr: z.unknown().nullable(),
  contentEn: z.unknown().nullable(),
  primaryLanguage: z.string(),
  techPersona: z.string().nullable(),
  techArea: z.string().nullable(),
  primaryStack: z.array(z.string()),
  experienceYears: z.number().int().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  website: z.string().nullable(),
  summary: z.string().nullable(),
  currentCompanyLogo: z.string().nullable(),
  twitter: z.string().nullable(),
  medium: z.string().nullable(),
  devto: z.string().nullable(),
  stackoverflow: z.string().nullable(),
  kaggle: z.string().nullable(),
  hackerrank: z.string().nullable(),
  leetcode: z.string().nullable(),
  accentColor: z.string().nullable(),
  customTheme: z.unknown().nullable(),
  styleId: z.string().nullable(),
  profileViews: z.number().int(),
  totalStars: z.number().int(),
  totalCommits: z.number().int(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  publishedAt: IsoDateTimeSchema.nullable(),
  sections: z.array(PublicResumeSectionSchema),
});

export const PublicShareInfoSchema = z.object({
  slug: z.string(),
  expiresAt: IsoDateTimeSchema.nullable(),
});

export const PublicResumeResponseSchema = z.object({
  resume: PublicResumeSchema.nullable(),
  share: PublicShareInfoSchema,
});

export const SharePayloadSchema = z.object({
  id: z.string(),
  slug: z.string(),
  resumeId: z.string(),
  isActive: z.boolean(),
  hasPassword: z.boolean(),
  expiresAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  publicUrl: z.string(),
});

export const ShareCreateResponseSchema = z.object({ share: SharePayloadSchema });
export const ShareListResponseSchema = z.object({ shares: z.array(SharePayloadSchema) });
export const ShareDeleteResponseSchema = z.object({ deleted: z.boolean() });

export const AliasPayloadSchema = z.object({
  id: z.string(),
  slug: z.string(),
  shareId: z.string(),
});

export const AliasCreateResponseSchema = z.object({ alias: AliasPayloadSchema });
export const AliasListResponseSchema = z.object({ aliases: z.array(AliasPayloadSchema) });

export function pickIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown';
  if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0] ?? 'unknown';
  return 'unknown';
}

export function pickHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}
