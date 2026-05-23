import type { FlagDefinition } from '../domain/types';
import { BILLING_FLAGS } from './groups/billing.flags';
import { CHAT_FLAGS } from './groups/chat.flags';
import { EXPERIMENTS_FLAGS } from './groups/experiments.flags';
import { INTEGRATIONS_FLAGS } from './groups/integrations.flags';
import { JOBS_FLAGS } from './groups/jobs.flags';
import { NOTIFICATIONS_FLAGS } from './groups/notifications.flags';
import { RESUMES_FLAGS } from './groups/resumes.flags';
import { SCORING_FLAGS } from './groups/scoring.flags';
import { SOCIAL_FLAGS } from './groups/social.flags';

/**
 * Source of truth for flags that the application code checks.
 *
 * Rules:
 * - Add a flag here BEFORE referencing it in code — boot validates the DAG.
 * - Declare parents in `dependsOn` so cascading OFF works automatically.
 * - Removing a flag marks existing DB row as `deprecated` (not deleted) so
 *   audit history survives. If you later re-add the key, it re-activates.
 * - `defaultEnabled` only applies on first insert. After that, admin state wins.
 */
export const FEATURE_FLAGS_REGISTRY = [
  ...RESUMES_FLAGS,
  ...JOBS_FLAGS,
  ...SOCIAL_FLAGS,
  ...CHAT_FLAGS,
  ...NOTIFICATIONS_FLAGS,
  ...BILLING_FLAGS,
  ...INTEGRATIONS_FLAGS,
  ...EXPERIMENTS_FLAGS,
  ...SCORING_FLAGS,
] as const satisfies readonly FlagDefinition[];

export type RegisteredFlagKey = (typeof FEATURE_FLAGS_REGISTRY)[number]['key'];
