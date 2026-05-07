/**
 * Dredd contract-test fixture seed.
 *
 * Materialises the deterministic UUIDs declared in
 * `src/shared-kernel/schemas/params/example-values.const.ts` as real rows
 * so Dredd's generated requests resolve to existing entities. Without
 * these, every transaction that hits a `/users/:id`-shaped route would
 * return 404 and the contract job would be useless.
 *
 * Idempotent: every row uses `upsert` so re-running the seed (or
 * sharing a database with other tests) is safe.
 */

import { JobType, NotificationType, PostType, type PrismaClient } from '@prisma/client';
import {
  EXAMPLE_CONVERSATION_ID,
  EXAMPLE_JOB_ID,
  EXAMPLE_NOTIFICATION_ID,
  EXAMPLE_POST_ID,
  EXAMPLE_RESUME_ID,
  EXAMPLE_SLUG,
  EXAMPLE_USER_ID,
} from '../../src/shared-kernel/schemas/params/example-values.const';

const FIXTURE_USER_EMAIL = 'dredd-fixture@profile.local';
const FIXTURE_USER_NAME = 'Dredd Fixture User';
const FIXTURE_USERNAME = 'dredd-fixture';

export async function seedDreddFixtures(
  prisma: PrismaClient,
  participantTwoUserId: string,
): Promise<void> {
  const passwordHash = await Bun.password.hash('Dredd_Fixture_Password_123!', {
    algorithm: 'bcrypt',
    cost: Number.parseInt(process.env.BCRYPT_COST ?? '10', 10),
  });

  await prisma.user.upsert({
    where: { id: EXAMPLE_USER_ID },
    create: {
      id: EXAMPLE_USER_ID,
      email: FIXTURE_USER_EMAIL,
      name: FIXTURE_USER_NAME,
      username: FIXTURE_USERNAME,
      passwordHash,
      emailVerified: new Date(),
      isActive: true,
      onboardingCompletedAt: new Date(),
      roles: ['role_user'],
    },
    update: {
      emailVerified: new Date(),
      onboardingCompletedAt: new Date(),
      isActive: true,
      passwordHash,
    },
  });

  const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
  if (userRole) {
    await prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: { userId: EXAMPLE_USER_ID, roleId: userRole.id },
      },
      create: { userId: EXAMPLE_USER_ID, roleId: userRole.id },
      update: {},
    });
  }

  await prisma.resume.upsert({
    where: { id: EXAMPLE_RESUME_ID },
    create: {
      id: EXAMPLE_RESUME_ID,
      userId: EXAMPLE_USER_ID,
      title: 'Dredd Fixture Resume',
      fullName: FIXTURE_USER_NAME,
      jobTitle: 'Contract Test Subject',
      language: 'pt-br',
      isPublic: true,
      slug: 'dredd-fixture-resume',
    },
    update: {},
  });

  await prisma.job.upsert({
    where: { id: EXAMPLE_JOB_ID },
    create: {
      id: EXAMPLE_JOB_ID,
      authorId: EXAMPLE_USER_ID,
      title: 'Dredd Fixture Job',
      company: 'Fixture Co',
      jobType: JobType.FULL_TIME,
      description: 'Contract-test placeholder job listing.',
      requirements: [],
      skills: [],
    },
    update: {},
  });

  await prisma.post.upsert({
    where: { id: EXAMPLE_POST_ID },
    create: {
      id: EXAMPLE_POST_ID,
      authorId: EXAMPLE_USER_ID,
      type: PostType.ACHIEVEMENT,
      content: 'Dredd fixture post body.',
    },
    update: {},
  });

  const [participant1Id, participant2Id] =
    EXAMPLE_USER_ID < participantTwoUserId
      ? [EXAMPLE_USER_ID, participantTwoUserId]
      : [participantTwoUserId, EXAMPLE_USER_ID];

  await prisma.conversation.upsert({
    where: { id: EXAMPLE_CONVERSATION_ID },
    create: {
      id: EXAMPLE_CONVERSATION_ID,
      participant1Id,
      participant2Id,
    },
    update: {},
  });

  await prisma.notification.upsert({
    where: { id: EXAMPLE_NOTIFICATION_ID },
    create: {
      id: EXAMPLE_NOTIFICATION_ID,
      userId: EXAMPLE_USER_ID,
      type: NotificationType.POST_LIKED,
      message: 'Dredd fixture notification.',
    },
    update: {},
  });

  // Feature flag keyed by EXAMPLE_SLUG so admin feature-flag routes
  // (`/v1/admin/feature-flags/{key}`, `/.../impact`) resolve to a real
  // row instead of 404'ing under Dredd's slug substitution.
  await prisma.featureFlag.upsert({
    where: { key: EXAMPLE_SLUG },
    create: {
      key: EXAMPLE_SLUG,
      name: 'Dredd Fixture Feature Flag',
      description: 'Materialised by the Dredd seed so admin feature-flag routes resolve.',
      enabled: false,
    },
    update: {},
  });

  console.log(
    '✅ Seeded Dredd fixture entities (user/resume/job/post/conversation/notification/feature-flag)',
  );
}
