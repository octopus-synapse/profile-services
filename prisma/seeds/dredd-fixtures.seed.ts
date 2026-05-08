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

import {
  ConnectionStatus,
  FitDimension,
  ImportSource,
  ImportStatus,
  JobApplicationStatus,
  JobType,
  LayoutKind,
  ModifierEffect,
  ModifierType,
  NotificationType,
  PostType,
  type PrismaClient,
} from '@prisma/client';
import {
  EXAMPLE_CONVERSATION_ID,
  EXAMPLE_GENERIC_ID,
  EXAMPLE_JOB_ID,
  EXAMPLE_NOTIFICATION_ID,
  EXAMPLE_POST_ID,
  EXAMPLE_RESUME_ID,
  EXAMPLE_SLUG,
  EXAMPLE_USER_ID,
} from '../../src/shared-kernel/schemas/params/example-values.const';

const FIXTURE_USER_EMAIL = 'dredd-fixture@profile.local';
const FIXTURE_USER_NAME = 'Dredd Fixture User';
const FIXTURE_USERNAME = 'fixture-user';

const DREDD_NOPERMS_USER_ID = '01900000-0000-7000-a000-000000000070';
const DREDD_NOPERMS_EMAIL = 'dredd-noperms@profile.local';

const DREDD_GENERIC_USER_ID = EXAMPLE_GENERIC_ID;
const DREDD_GENERIC_USER_EMAIL = 'dredd-generic@profile.local';

export async function seedDreddFixtures(
  prisma: PrismaClient,
  participantTwoUserId: string,
): Promise<void> {
  const passwordHash = await Bun.password.hash('Dredd_Fixture_Password_123!', {
    algorithm: 'bcrypt',
    cost: Number.parseInt(process.env.BCRYPT_COST ?? '10', 10),
  });

  // ── Primary fixture user (has role_user permissions) ─────────────────
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
      username: FIXTURE_USERNAME,
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

  // ── Generic-id fixture user (for /users/manage/{id} routes) ──────────
  // This user has EXAMPLE_GENERIC_ID so admin manage-user routes resolve.
  // It must not be destroyed during the Dredd run; the DELETE is in
  // SKIP_DESTRUCTIVE_OPS in dredd-hooks.js.
  await prisma.user.upsert({
    where: { id: DREDD_GENERIC_USER_ID },
    create: {
      id: DREDD_GENERIC_USER_ID,
      email: DREDD_GENERIC_USER_EMAIL,
      name: 'Dredd Generic User',
      username: 'dredd-generic',
      passwordHash,
      emailVerified: new Date(),
      isActive: true,
      onboardingCompletedAt: new Date(),
      roles: ['role_user'],
    },
    update: { emailVerified: new Date(), isActive: true, passwordHash },
  });

  // ── No-permissions fixture user (for 403 probes) ──────────────────────
  await prisma.user.upsert({
    where: { id: DREDD_NOPERMS_USER_ID },
    create: {
      id: DREDD_NOPERMS_USER_ID,
      email: DREDD_NOPERMS_EMAIL,
      name: 'Dredd No-Perms User',
      username: 'dredd-noperms',
      passwordHash,
      emailVerified: new Date(),
      isActive: true,
      onboardingCompletedAt: new Date(),
      roles: [],
    },
    update: { emailVerified: new Date(), isActive: true, passwordHash },
  });

  // ── Resume (slug = fixture-slug for public-resume routes) ────────────
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
      slug: EXAMPLE_SLUG,
    },
    update: { slug: EXAMPLE_SLUG },
  });

  // ── Primary fixture job (with EXAMPLE_JOB_ID for {jobId} routes) ─────
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

  // ── Generic-id job (for /jobs/{id} routes that use EXAMPLE_GENERIC_ID) ─
  await prisma.job.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      authorId: EXAMPLE_USER_ID,
      title: 'Dredd Generic Job',
      company: 'Fixture Co',
      jobType: JobType.FULL_TIME,
      description: 'Generic fixture job for Dredd {id} param routes.',
      requirements: [],
      skills: [],
    },
    update: {},
  });

  // ── Primary fixture post (with EXAMPLE_POST_ID for {postId} routes) ──
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

  // ── Generic-id post (for /posts/{id} routes that use EXAMPLE_GENERIC_ID) ─
  await prisma.post.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      authorId: EXAMPLE_USER_ID,
      type: PostType.ACHIEVEMENT,
      content: 'Dredd generic post body.',
    },
    update: {},
  });

  // ── Conversation (already seeded) ─────────────────────────────────────
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

  // ── Notification (already seeded) ─────────────────────────────────────
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

  // ── Feature flag (keyed by EXAMPLE_SLUG for admin feature-flag routes) ─
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

  // ── Admin catalog fixtures ─────────────────────────────────────────────
  // Each entity needs either EXAMPLE_GENERIC_ID (for {id} routes) or
  // EXAMPLE_SLUG (for {key}/{slug}/{code} routes).

  // SectionType with key = fixture-slug (for admin section-type routes)
  // isSystem must be false so the DELETE (204) contract test can delete it.
  await prisma.sectionType.upsert({
    where: { key: EXAMPLE_SLUG },
    create: {
      key: EXAMPLE_SLUG,
      slug: EXAMPLE_SLUG,
      title: 'Fixture Section',
      description: 'Dredd fixture section type.',
      semanticKind: 'experience',
      isSystem: false,
      definition: { fields: [], translations: {} },
      uiSchema: { fields: [], translations: {} },
      renderHints: { fields: [], translations: {} },
      fieldStyles: {},
      iconType: 'emoji',
      icon: '📄',
      translations: {},
    },
    update: {
      isSystem: false,
      definition: { fields: [], translations: {} },
      uiSchema: { fields: [], translations: {} },
      renderHints: { fields: [], translations: {} },
    },
  });

  // OnboardingStep with key = fixture-slug
  await prisma.onboardingStep.upsert({
    where: { key: EXAMPLE_SLUG },
    create: {
      key: EXAMPLE_SLUG,
      order: 99,
      component: 'FixtureStep',
      icon: '📄',
      required: false,
      fields: [],
      translations: {},
    },
    update: {},
  });

  // ProgrammingLanguage with slug = fixture-slug
  await prisma.programmingLanguage.upsert({
    where: { slug: EXAMPLE_SLUG },
    create: {
      id: EXAMPLE_GENERIC_ID,
      slug: EXAMPLE_SLUG,
      nameEn: 'Fixture Language',
      namePtBr: 'Linguagem Fixture',
      descriptionEn: 'Dredd fixture programming language.',
      descriptionPtBr: 'Linguagem de programação fixture do Dredd.',
    },
    update: {},
  });

  // SpokenLanguage with code = fixture-slug
  await prisma.spokenLanguage.upsert({
    where: { code: EXAMPLE_SLUG },
    create: {
      id: EXAMPLE_GENERIC_ID,
      code: EXAMPLE_SLUG,
      nameEn: 'Fixture Language',
      namePtBr: 'Língua Fixture',
      nameEs: 'Idioma Fixture',
      nativeName: 'Fixture',
    },
    update: {},
  });

  // TechArea: update 'OTHER' area's id to EXAMPLE_GENERIC_ID so Dredd's
  // {id} → EXAMPLE_GENERIC_ID routes resolve. No niches reference 'OTHER'
  // (the niche below uses DEVELOPMENT) so the DELETE (200) contract test works.
  await prisma.$executeRaw`
    UPDATE "TechArea"
    SET id = ${EXAMPLE_GENERIC_ID}
    WHERE type = 'OTHER'::"TechAreaType"
      AND id != ${EXAMPLE_GENERIC_ID}
  `;

  const developmentArea = await prisma.techArea.findUnique({ where: { type: 'DEVELOPMENT' } });

  // TechNiche with id = EXAMPLE_GENERIC_ID references DEVELOPMENT (not OTHER/EXAMPLE_GENERIC_ID)
  // so the OTHER area remains niche-free and the DELETE (200) contract test can delete it.
  await prisma.techNiche.upsert({
    where: { slug: EXAMPLE_SLUG },
    create: {
      id: EXAMPLE_GENERIC_ID,
      slug: EXAMPLE_SLUG,
      nameEn: 'Fixture Niche',
      namePtBr: 'Nicho Fixture',
      descriptionEn: 'Dredd fixture tech niche.',
      descriptionPtBr: 'Nicho técnico fixture do Dredd.',
      areaId: developmentArea!.id,
    },
    update: { areaId: developmentArea!.id },
  });

  // TechSkill with id = EXAMPLE_GENERIC_ID
  await prisma.techSkill.upsert({
    where: { slug: 'fixture-skill' },
    create: {
      id: EXAMPLE_GENERIC_ID,
      slug: 'fixture-skill',
      nameEn: 'Fixture Skill',
      namePtBr: 'Habilidade Fixture',
      descriptionEn: 'Dredd fixture tech skill.',
      descriptionPtBr: 'Habilidade técnica fixture do Dredd.',
    },
    update: {},
  });

  // FitQuestion with id = EXAMPLE_GENERIC_ID
  await prisma.fitQuestion.upsert({
    where: { key: 'fixture-fit-q' },
    create: {
      id: EXAMPLE_GENERIC_ID,
      key: 'fixture-fit-q',
      dimension: FitDimension.BIG_FIVE_OPENNESS,
      textEn: 'I enjoy exploring new ideas.',
      textPtBr: 'Gosto de explorar novas ideias.',
      scaleType: 'likert5',
      weight: 1.0,
      isActive: true,
    },
    update: {},
  });

  // ResumeStyle with id = EXAMPLE_GENERIC_ID
  await prisma.resumeStyle.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      name: 'Dredd Fixture Style',
      description: 'Fixture resume style for Dredd contract tests.',
      authorId: participantTwoUserId,
      layoutKind: LayoutKind.SINGLE_COLUMN,
      typstTemplate: 'fixture.typ',
      styleScore: 0,
      styleConfig: {},
    },
    update: {},
  });

  // ── ResumeShare (for {shareId} routes) ───────────────────────────────
  await prisma.resumeShare.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      resumeId: EXAMPLE_RESUME_ID,
      slug: `${EXAMPLE_SLUG}-share`,
    },
    update: {},
  });

  // ── ResumeShareAlias (for {aliasId} routes) ────────────────────────
  await prisma.resumeShareAlias.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      shareId: EXAMPLE_GENERIC_ID,
      slug: `${EXAMPLE_SLUG}-alias`,
    },
    update: {},
  });

  // ── ResumeImport (for {importId} routes) ──────────────────────────
  await prisma.resumeImport.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      userId: EXAMPLE_USER_ID,
      source: ImportSource.JSON,
      status: ImportStatus.COMPLETED,
    },
    update: {},
  });

  // ── ResumeVersion (for {versionId} routes) ────────────────────────
  await prisma.resumeVersion.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      resumeId: EXAMPLE_RESUME_ID,
      versionNumber: 1,
      snapshot: {},
    },
    update: {},
  });


  // ── CollaborationComment (for {commentId} routes) ─────────────────
  await prisma.collaborationComment.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      resumeId: EXAMPLE_RESUME_ID,
      authorId: EXAMPLE_USER_ID,
      content: 'Dredd fixture comment.',
    },
    update: {},
  });

  // ── WeeklyCuratedBatch + WeeklyCuratedItem (for apply-mode {itemId} routes) ─
  const fixtureBatch = await prisma.weeklyCuratedBatch.upsert({
    where: {
      userId_weekOf: {
        userId: EXAMPLE_USER_ID,
        weekOf: new Date('2026-01-05T00:00:00.000Z'),
      },
    },
    create: {
      userId: EXAMPLE_USER_ID,
      weekOf: new Date('2026-01-05T00:00:00.000Z'),
    },
    update: {},
  });
  await prisma.weeklyCuratedItem.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      batchId: fixtureBatch.id,
      jobId: EXAMPLE_JOB_ID,
      matchScore: 80,
    },
    update: {},
  });

  // ── JobApplication (for {applicationId} routes) ───────────────────
  await prisma.jobApplication.upsert({
    where: { jobId_userId: { jobId: EXAMPLE_JOB_ID, userId: EXAMPLE_USER_ID } },
    create: {
      id: EXAMPLE_GENERIC_ID,
      jobId: EXAMPLE_JOB_ID,
      userId: EXAMPLE_USER_ID,
      status: JobApplicationStatus.SUBMITTED,
    },
    update: {},
  });

  // ── AccessModifier (for {modifierId} routes) ──────────────────────
  await prisma.accessModifier.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      userId: EXAMPLE_GENERIC_ID,
      modifierType: ModifierType.SUSPEND_EMAIL_VERIFIED,
      effect: ModifierEffect.DENY,
      reason: 'Dredd fixture modifier.',
      createdBy: EXAMPLE_USER_ID,
    },
    update: {},
  });

  // ── Connection (for /connections/{id}/accept|reject|withdraw|delete) ─
  await prisma.connection.upsert({
    where: { requesterId_targetId: { requesterId: EXAMPLE_GENERIC_ID, targetId: EXAMPLE_USER_ID } },
    create: {
      id: EXAMPLE_GENERIC_ID,
      requesterId: EXAMPLE_GENERIC_ID,
      targetId: EXAMPLE_USER_ID,
      status: ConnectionStatus.PENDING,
    },
    update: { status: ConnectionStatus.PENDING },
  });

  // ── PostComment (for /posts/comments/{id} DELETE) ─────────────────
  await prisma.postComment.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      postId: EXAMPLE_GENERIC_ID,
      authorId: EXAMPLE_USER_ID,
      content: 'Dredd fixture post comment.',
    },
    update: {},
  });

  // ── SuccessStory (for /success-stories/{id} PATCH/DELETE) ─────────
  await prisma.successStory.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      userId: EXAMPLE_USER_ID,
      headline: 'Dredd Fixture Story',
      beforeText: 'Before the fixture.',
      afterText: 'After the fixture.',
      quote: 'Dredd fixture quote.',
    },
    update: {},
  });

  // ── WebhookConfig (for /webhooks/{id} PATCH/DELETE/deliveries) ────
  await prisma.webhookConfig.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      userId: EXAMPLE_USER_ID,
      url: 'https://fixture.example.com/webhook',
      secret: 'dredd-fixture-secret',
      events: ['resume.created'],
    },
    update: {},
  });

  // ── ShadowProfile (for /shadow-profiles/{id}/claim POST) ─────────
  await prisma.shadowProfile.upsert({
    where: { source_externalHandle: { source: 'github', externalHandle: 'dredd-fixture' } },
    create: {
      id: EXAMPLE_GENERIC_ID,
      source: 'github',
      externalHandle: 'dredd-fixture',
      payload: { login: 'dredd-fixture', name: 'Dredd Fixture', publicRepos: 0 },
    },
    update: {},
  });

  // ── UserSkillProficiency (for /users/{userId}/skills/{skill}/* routes) ─
  await prisma.userSkillProficiency.upsert({
    where: { userId_skillName: { userId: EXAMPLE_USER_ID, skillName: 'Fixture User' } },
    create: { userId: EXAMPLE_USER_ID, skillName: 'Fixture User' },
    update: {},
  });

  console.log(
    '✅ Seeded Dredd fixture entities (users/resume/jobs/posts/conversation/notification/feature-flag/catalog/shares/imports/versions/sections/comments/apply-mode/connections/webhooks)',
  );
}
