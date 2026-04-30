/**
 * Feature flag DTOs — Zod-first.
 *
 * All shapes are exported as Zod schemas (for route-descriptor /
 * `createZodDto` consumption) plus inferred type aliases. The legacy
 * `Dto` class names are kept as `createZodDto` extensions for any
 * remaining `@nestjs/swagger` discovery paths.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Evaluate
// ---------------------------------------------------------------------------

export const FeatureFlagEvaluationSchema = z.object({
  flags: z
    .record(z.string(), z.boolean())
    .describe('Map of flag key to effective boolean state for the calling user.'),
});

export class FeatureFlagEvaluationDto extends createZodDto(FeatureFlagEvaluationSchema) {}

// ---------------------------------------------------------------------------
// Admin list
// ---------------------------------------------------------------------------

export const FeatureFlagAdminRowSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  enabledForRoles: z.array(z.string()),
  deprecated: z.boolean(),
  dependsOn: z.array(z.string()),
  blockedBy: z.array(z.string()).describe('Parents currently OFF blocking this from turning ON.'),
  effectiveGlobal: z.boolean().describe('Effective state ignoring roles (global view).'),
});

export class FeatureFlagAdminRowDto extends createZodDto(FeatureFlagAdminRowSchema) {}

export const FeatureFlagAdminListSchema = z.object({
  flags: z.array(FeatureFlagAdminRowSchema),
});

export class FeatureFlagAdminListDto extends createZodDto(FeatureFlagAdminListSchema) {}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

/** New enabled state (omit to leave unchanged) + optional role allow-list. */
export const ToggleFeatureFlagSchema = z
  .object({
    enabled: z.boolean().optional(),
    enabledForRoles: z.array(z.string()).optional(),
  })
  .strict();

export class ToggleFeatureFlagDto extends createZodDto(ToggleFeatureFlagSchema) {}

// ---------------------------------------------------------------------------
// Impact analysis (recursive tree)
// ---------------------------------------------------------------------------

export type FeatureFlagImpactNode = {
  key: string;
  children: FeatureFlagImpactNode[];
};

export const FeatureFlagImpactNodeSchema: z.ZodType<FeatureFlagImpactNode> = z.lazy(() =>
  z.object({
    key: z.string(),
    children: z.array(FeatureFlagImpactNodeSchema),
  }),
);

export class FeatureFlagImpactNodeDto extends createZodDto(
  FeatureFlagImpactNodeSchema as unknown as z.ZodObject<z.ZodRawShape>,
) {}

export const FeatureFlagImpactSchema = z.object({
  tree: FeatureFlagImpactNodeSchema,
});

export class FeatureFlagImpactDto extends createZodDto(FeatureFlagImpactSchema) {}
