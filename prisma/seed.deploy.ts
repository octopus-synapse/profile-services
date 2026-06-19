/**
 * Deploy-time seed — runs on EVERY deploy via the container entrypoint
 * (`docker-entrypoint.sh`). It (re)applies the idempotent reference
 * catalogs the running app depends on, so a change to e.g. section-type
 * field translations reaches production without a manual reseed.
 *
 * This is intentionally a SUBSET of `prisma/seed.ts`. Because it runs on
 * every container start, every seeder here MUST be:
 *   - idempotent (upsert by key), and
 *   - free of external I/O and of any per-row scaling cost.
 *
 * Deliberately EXCLUDED (vs `prisma/seed.ts`), and why:
 *   - admin / E2E / dev fixture users — would install real account rows
 *   - tech-skills, jobs — hit external APIs (tech-skills has its own cron)
 *   - resume styles, jobs — require an admin userId we don't resolve here
 *   - usernames, analytics projections — cost scales with table size
 *
 * Failures are surfaced (exit 1) but the entrypoint treats them as
 * non-fatal so a seed bug never takes the API down.
 */

import { PrismaClient } from '@prisma/client';
import { seedAuthorization } from '../src/bounded-contexts/identity/authorization/seeds/seed.runner';
import { createPrismaClientOptions } from '../src/bounded-contexts/platform/prisma/prisma-client-options';
import { seedFitQuestions } from './seeds/fit-questions.seed';
import { seedOnboardingSteps } from './seeds/onboarding-step.seed';
import { seedSectionTypes } from './seeds/section-type.seed';
import { seedSpokenLanguages } from './seeds/spoken-language.seed';
import { seedStyleScoringCriteria } from './seeds/style-scoring-criteria.seed';

const prisma = new PrismaClient(createPrismaClientOptions());

async function main(): Promise<void> {
  console.log('🌱 [deploy-seed] applying reference catalogs…');

  // Roles / permissions (manages its own client).
  await seedAuthorization();

  // Data-driven Style Score rubric.
  await seedStyleScoringCriteria(prisma);

  // Psychometric fit-question pool.
  await seedFitQuestions(prisma);

  // Spoken languages catalog.
  await seedSpokenLanguages(prisma);

  // Semantic section types — includes the field-level translations the
  // onboarding session resolver reads (a missing one is a hard 500).
  await seedSectionTypes(prisma);

  // Onboarding flow config (steps, strength, examples).
  await seedOnboardingSteps(prisma);

  console.log('✅ [deploy-seed] reference catalogs up to date');
}

main()
  .catch((e) => {
    console.error('❌ [deploy-seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
