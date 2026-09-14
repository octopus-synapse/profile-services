/**
 * Satisfies the two domain gates guarding `POST /v1/resumes/:resumeId/tailor`
 * so the prompt lab (`/api/dev/tailor-lab`) stops 403-ing on a fresh dev DB.
 *
 * The lab route declares the SAME guards as the production route — there is no
 * bypass. This script makes the data true instead:
 *
 *   fit-profile  → a UserFitProfile row with a non-null vector and `expiresAt`
 *                  in the future (that is what makes the status 'responded').
 *   min-quality  → a ResumeQualityScoreHistory row per resume. The guard reads
 *                  only the latest row and blocks when there is none; seeding
 *                  one avoids spending an LLM call on /quality/recompute.
 *
 * Idempotent, and worth re-running after every `make dev` — the dev container
 * re-runs `prisma/seed.ts` on each start.
 *
 * Usage: bun run scripts/dev/prepare-tailor-lab.ts --email you@example.com
 */
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../../src/bounded-contexts/platform/prisma/prisma-client-options';

if (process.env.NODE_ENV === 'production') {
  throw new Error('prepare-tailor-lab is a development-only script.');
}

const SCORING_RULES_VERSION = 'tailor-lab-1.0.0';
/** Comfortably above the tailor route's threshold of 50. */
const SEEDED_QUALITY_SCORE = 80;
const FIT_TTL_DAYS = 90;
const LAB_URL = 'http://localhost:13001/api/dev/tailor-lab';

/**
 * Shape mirrors `prisma/seeds/dev/dredd-fixtures.seed.ts`. The persisted
 * contract only requires a non-empty structure — the guard checks presence and
 * freshness, not the values.
 */
const FIT_VECTOR = {
  bigFive: {
    BIG_FIVE_OPENNESS: 0.7,
    BIG_FIVE_CONSCIENTIOUSNESS: 0.7,
    BIG_FIVE_EXTRAVERSION: 0.5,
    BIG_FIVE_AGREEABLENESS: 0.6,
    BIG_FIVE_NEUROTICISM: 0.4,
  },
  schwartz: {
    SCHWARTZ_SELF_DIRECTION: 0.7,
    SCHWARTZ_STIMULATION: 0.5,
    SCHWARTZ_HEDONISM: 0.5,
    SCHWARTZ_ACHIEVEMENT: 0.7,
    SCHWARTZ_POWER: 0.4,
    SCHWARTZ_SECURITY: 0.6,
    SCHWARTZ_CONFORMITY: 0.5,
    SCHWARTZ_TRADITION: 0.4,
    SCHWARTZ_BENEVOLENCE: 0.7,
    SCHWARTZ_UNIVERSALISM: 0.7,
  },
  sdt: { SDT_AUTONOMY: 0.7, SDT_COMPETENCE: 0.7, SDT_RELATEDNESS: 0.6 },
};

function parseEmail(argv: string[]): string {
  const flagIndex = argv.indexOf('--email');
  const value = flagIndex >= 0 ? argv[flagIndex + 1] : undefined;
  if (!value) {
    throw new Error(
      'Missing --email. Usage: bun run scripts/dev/prepare-tailor-lab.ts --email you@example.com',
    );
  }
  return value;
}

const prisma = new PrismaClient(createPrismaClientOptions());

async function main(): Promise<void> {
  const email = parseEmail(process.argv.slice(2));

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, primaryResumeId: true, onboardingCompletedAt: true },
  });
  if (!user) {
    throw new Error(
      `No user with email "${email}". Seed one first (make dev runs prisma/seed.ts).`,
    );
  }

  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  });
  if (resumes.length === 0) {
    throw new Error(`User "${email}" has no resume. Create one in the app before running the lab.`);
  }

  // The tailor guard resolves the resume from the path, so primaryResumeId is
  // not strictly required — but the lab pre-selects it, and export/PDF needs it.
  if (!user.primaryResumeId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { primaryResumeId: resumes[0]!.id },
    });
    console.log(`• primaryResumeId → ${resumes[0]!.id}`);
  }

  const expiresAt = new Date(Date.now() + FIT_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.userFitProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, vectorJson: FIT_VECTOR, version: 1, expiresAt },
    update: { vectorJson: FIT_VECTOR, version: 1, expiresAt },
  });
  console.log(`• fit-profile gate satisfied (expires ${expiresAt.toISOString().slice(0, 10)})`);

  for (const resume of resumes) {
    await prisma.resumeQualityScoreHistory.deleteMany({
      where: { resumeId: resume.id, scoringRulesVersion: SCORING_RULES_VERSION },
    });
    await prisma.resumeQualityScoreHistory.create({
      data: {
        resumeId: resume.id,
        overallScore: SEEDED_QUALITY_SCORE,
        completenessScore: SEEDED_QUALITY_SCORE,
        contentQualityScore: SEEDED_QUALITY_SCORE,
        issuesJson: [],
        scoringRulesVersion: SCORING_RULES_VERSION,
      },
    });
  }
  console.log(
    `• min-quality gate satisfied for ${resumes.length} resume(s) (score ${SEEDED_QUALITY_SCORE})`,
  );

  // The auth lockout stage counts failed attempts per email (5 in 15 min → 423),
  // and the lab's inline login form makes typos cheap.
  const cleared = await prisma.loginAttempt.deleteMany({ where: { email, success: false } });
  if (cleared.count > 0) console.log(`• cleared ${cleared.count} failed login attempt(s)`);

  if (!user.onboardingCompletedAt) {
    console.log('⚠ onboarding is not complete for this user — the permission guard will 403.');
    console.log('  Either finish onboarding in the app, or set SKIP_TOS_CHECK=true in .env.');
  }

  console.log('\nReady. Resumes you can tailor:');
  for (const resume of resumes) console.log(`  ${resume.id}  ${resume.title}`);
  console.log(`\nOpen ${LAB_URL}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
