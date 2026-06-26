/**
 * DEV seeds — fixtures and catalogs that must NOT run in production: test users
 * with known passwords, seeders that hit external APIs (tech-skills, jobs),
 * seeders that need an admin owner (resume styles, jobs, dredd), and backfills
 * whose cost scales with the table (usernames, analytics projections).
 *
 * Runs after the shared catalogs and after the admin user exists (its id is
 * passed in).
 */
import type { PrismaClient } from '@prisma/client';
import { seedAnalyticsProjections } from './analytics-projection.seed';
import { seedDreddFixtures } from './dredd-fixtures.seed';
import { seedE2EOnboardingUser } from './e2e-onboarding-user.seed';
import { seedE2ETestUser } from './e2e-test-user.seed';
import { seedEnzoferracini } from './enzoferracini.seed';
import { seedJobs } from './job.seed';
import { seedResumeStyles } from './resume-styles.seed';
import { seedTechSkills } from './tech-skill.seed';
import { seedUsernames } from './username.seed';

export async function runDevSeeds(
  prisma: PrismaClient,
  { adminId }: { adminId: string },
): Promise<void> {
  // Catalogs that need the admin owner / external data.
  await seedResumeStyles(prisma, adminId);
  await seedTechSkills(prisma);
  await seedJobs(prisma, adminId);
  await seedUsernames(prisma);

  // Fixture users.
  await seedE2ETestUser(prisma);
  await seedEnzoferracini(prisma);
  await seedE2EOnboardingUser(prisma);
  if (process.env.NODE_ENV === 'test' || process.env.SEED_DREDD_FIXTURES === '1') {
    await seedDreddFixtures(prisma, adminId);
  }

  // LAST: projects from existing resumes (incl. the dredd fixtures above), so
  // the analytics contract probes don't 404 on missing projection rows.
  await seedAnalyticsProjections(prisma);
}
