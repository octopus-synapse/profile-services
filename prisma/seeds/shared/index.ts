/**
 * SHARED seeds — reference catalogs the running app depends on, needed in BOTH
 * dev and production. The single source of truth for "what's shared": both the
 * dev runner (prisma/seed.ts) and the deploy runner (prisma/seed.deploy.ts)
 * call this.
 *
 * INVARIANT for everything in this bucket (it runs on every deploy via the
 * container entrypoint): idempotent (upsert by key), no external I/O, no
 * per-row scaling cost. Anything that violates this belongs in dev/.
 */
import type { PrismaClient } from '@prisma/client';
import { seedAuthorization } from './authorization.seed';
import { seedFitQuestions } from './fit-questions.seed';
import { seedOnboardingSteps } from './onboarding-step.seed';
import { seedSectionGroups } from './section-group.seed';
import { seedSectionTypes } from './section-type.seed';
import { seedSpokenLanguages } from './spoken-language.seed';
import { seedStyleScoringCriteria } from './style-scoring-criteria.seed';

export async function runSharedSeeds(prisma: PrismaClient): Promise<void> {
  // Roles / permissions (manages its own Prisma client).
  await seedAuthorization();
  // Data-driven Style Score rubric (before any styles consume it).
  await seedStyleScoringCriteria(prisma);
  // Psychometric fit-question pool.
  await seedFitQuestions(prisma);
  // Spoken languages catalog.
  await seedSpokenLanguages(prisma);
  // Supersection groups MUST run before section types (groupKey guard).
  await seedSectionGroups(prisma);
  // Semantic section types (incl. field-level translations the onboarding
  // session resolver reads — a missing one is a hard 500).
  await seedSectionTypes(prisma);
  // Onboarding flow config (steps, strength, examples).
  await seedOnboardingSteps(prisma);
}
