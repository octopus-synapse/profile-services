/**
 * Route descriptors for the badges BC — golden output for the
 * framework-decoupling roadmap. Replaces `BadgeController`.
 *
 * The handlers are pure async functions that receive the framework-
 * free `HttpCtx` plus the use-case bundle. The Nest adapter
 * (`src/infrastructure/nest-adapter/synthesize-controller.ts`) turns
 * each `Route` into a Nest `@Controller` at boot.
 */

import { z } from 'zod';
import { UserIdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const ListForUserParams = UserIdParamSchema;

// ─── Response schemas ────────────────────────────────────────────────
// Mirrors `AwardedBadgeView` — `awardedAt` is already pre-serialized
// (the use case calls `.toISOString()`).
export const AwardedBadgeViewSchema = z.object({
  kind: z.string(),
  awardedAt: IsoDateTimeSchema,
});

export const ListBadgesResponseSchema = z.object({
  badges: z.array(AwardedBadgeViewSchema),
});
