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
  CollaboratorRole,
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
  type Prisma,
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

// `janedoe` is the hardcoded username inside several `.openapi({ example })`
// blocks (UsernameParam, CheckUsernameQuery, schema sample resumes). Several
// public profile routes (/v1/profiles/:username) feed `:username` from this
// example, so we materialise a real user with that username + a public resume.
const JANEDOE_USER_ID = '01900000-0000-7000-a000-000000000084';
const JANEDOE_RESUME_ID = '01900000-0000-7000-a000-000000000085';
const JANEDOE_EMAIL = 'janedoe@profile.local';

const FIXTURE_REFRESH_TOKEN_ID = '01900000-0000-7000-a000-000000000A01';
const FIXTURE_REFRESH_TOKEN_VALUE = 'fixture-refresh-token-aaaaaaaaaaaaaaaa';
const FIXTURE_EMAIL_VERIFY_TOKEN_ID = '01900000-0000-7000-a000-000000000A02';
const FIXTURE_EMAIL_VERIFY_TOKEN_VALUE = 'fixture-email-verify-token-bbbbbbbbbbbb';
const FIXTURE_PW_RESET_TOKEN_ID = '01900000-0000-7000-a000-000000000A03';
const FIXTURE_PW_RESET_TOKEN_VALUE = 'fixture-pw-reset-token-cccccccccccccccc';

// Dedicated user for the reset-password contract probe. Tying the reset
// token to EXAMPLE_USER_ID would invalidate that user's session (via the
// `auth:token_valid_after:*` cache key) and cascade-401 every subsequent
// authenticated probe in the same suite run. This isolated user has no
// other contract-test responsibility, so its session can be wiped freely.
const FIXTURE_PW_RESET_USER_ID = '01900000-0000-7000-a000-000000000071';
const FIXTURE_PW_RESET_USER_EMAIL = 'dredd-pwreset@profile.local';

const FIXTURE_THIRDPARTY_JOB_ID = '01900000-0000-7000-a000-000000000031';
const FIXTURE_TOGGLEABLE_FLAG_KEY = 'fixture-toggleable-flag';

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

  // ── `janedoe` fixture user (matches `.openapi({ example })` username) ─
  // GET /v1/profiles/:username derives `:username` from UsernameParam's
  // example (`janedoe`). We materialise a real public profile for it.
  await prisma.user.upsert({
    where: { id: JANEDOE_USER_ID },
    create: {
      id: JANEDOE_USER_ID,
      email: JANEDOE_EMAIL,
      name: 'Jane Doe',
      username: 'janedoe',
      passwordHash,
      emailVerified: new Date(),
      isActive: true,
      onboardingCompletedAt: new Date(),
      roles: ['role_user'],
    },
    update: {
      username: 'janedoe',
      emailVerified: new Date(),
      isActive: true,
      passwordHash,
    },
  });
  await prisma.resume.upsert({
    where: { id: JANEDOE_RESUME_ID },
    create: {
      id: JANEDOE_RESUME_ID,
      userId: JANEDOE_USER_ID,
      title: 'Jane Doe Public Resume',
      fullName: 'Jane Doe',
      jobTitle: 'Software Engineer',
      language: 'pt-br',
      isPublic: true,
      slug: 'janedoe',
      primaryStack: ['typescript', 'postgresql'],
      experienceYears: 4,
    },
    update: { isPublic: true, slug: 'janedoe' },
  });
  await prisma.user.update({
    where: { id: JANEDOE_USER_ID },
    data: { primaryResumeId: JANEDOE_RESUME_ID },
  });

  // ── Resume (slug = fixture-slug for public-resume routes) ────────────
  // primaryStack is populated with the career-graph default example stack
  // so the cohort lookup (intersection ≥ 60%) finds at least one peer.
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
      primaryStack: ['typescript', 'postgresql', 'aws', 'kubernetes'],
      experienceYears: 5,
    },
    update: {
      slug: EXAMPLE_SLUG,
      isPublic: true,
      primaryStack: ['typescript', 'postgresql', 'aws', 'kubernetes'],
      experienceYears: 5,
    },
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
  // Authored by the fixture user so the user-persona contract probes
  // (PATCH /v1/jobs/:id, GET /v1/jobs/:id/applications) treat the
  // requester as the owner. The trade-off: POST /v1/jobs/:id/apply
  // returns 403 (CANNOT_APPLY_TO_OWN_JOB) instead of 201 — see comment
  // below for the rationale.
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
    update: { authorId: EXAMPLE_USER_ID },
  });

  // ── JobFitProfile for the generic-id job ────────────────────────────
  // GET /v1/jobs/:id/fit-profile is admin-only and probes :id with the
  // generic-id job. Without a JobFitProfile row, the route 404s. The
  // mutation probe (POST /v1/jobs/:id/fit-profile) would create one,
  // but the GET probe runs first.
  await prisma.jobFitProfile.upsert({
    where: { jobId: EXAMPLE_GENERIC_ID },
    create: {
      jobId: EXAMPLE_GENERIC_ID,
      vectorJson: { bigFive: {}, schwartz: {}, sdt: {} },
      editedByUserId: participantTwoUserId,
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
  // The definition shape must satisfy `SectionDefinitionSchema` (kind +
  // schemaVersion + fields[]) — without this the section-item POST/PATCH
  // contract probes 400 with INVALID_SECTION_TYPE_DEFINITION.
  const fixtureSectionDefinition: Prisma.InputJsonValue = {
    schemaVersion: 1,
    kind: 'EXPERIENCE',
    fields: [
      {
        key: 'title',
        type: 'string',
        required: false,
        semanticRole: 'JOB_TITLE',
        meta: { label: 'Title' },
      },
    ],
  };
  await prisma.sectionType.upsert({
    where: { key: EXAMPLE_SLUG },
    create: {
      key: EXAMPLE_SLUG,
      slug: EXAMPLE_SLUG,
      title: 'Fixture Section',
      description: 'Dredd fixture section type.',
      semanticKind: 'experience',
      isSystem: false,
      definition: fixtureSectionDefinition,
      uiSchema: { fields: [], translations: {} },
      renderHints: { fields: [], translations: {} },
      fieldStyles: {},
      iconType: 'emoji',
      icon: '📄',
      translations: {},
    },
    update: {
      isSystem: false,
      definition: fixtureSectionDefinition,
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

  const developmentArea = await prisma.techArea.findUniqueOrThrow({
    where: { type: 'DEVELOPMENT' },
  });

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
      areaId: developmentArea.id,
    },
    update: { areaId: developmentArea.id },
  });

  // TechSkill with id = EXAMPLE_GENERIC_ID
  await prisma.techSkill.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
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

  // ResumeStyle with id = EXAMPLE_GENERIC_ID. styleConfig MUST be a fully
  // schema-valid ResumeDsl payload (version + layout + tokens + sections),
  // otherwise the DSL render use case fails with `DSL_RESUME_NO_ACTIVE_STYLE`
  // (empty config) or `DSL_VALIDATION_FAILED` (wrong shape).
  const fixtureStyleConfig = {
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'normal',
      pageBreakBehavior: 'auto',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'calibri', body: 'calibri' },
        fontSize: 'base',
        headingStyle: 'bold',
      },
      colors: {
        colors: {
          primary: '#111111',
          secondary: '#444444',
          background: '#FFFFFF',
          surface: '#F5F5F5',
          text: { primary: '#111111', secondary: '#444444', accent: '#222222' },
          border: '#CCCCCC',
          divider: '#EEEEEE',
        },
        borderRadius: 'sm',
        shadows: 'none',
      },
      spacing: { density: 'comfortable', sectionGap: 'md', itemGap: 'md', contentPadding: 'md' },
    },
    sections: [],
  };
  await prisma.resumeStyle.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      name: 'Dredd Fixture Style',
      description: 'Fixture resume style for Dredd contract tests.',
      authorId: participantTwoUserId,
      layoutKind: LayoutKind.SINGLE_COLUMN,
      typstTemplate: 'default',
      styleScore: 0,
      styleConfig: fixtureStyleConfig,
    },
    update: {
      typstTemplate: 'default',
      styleConfig: fixtureStyleConfig,
    },
  });

  // ── Pin the fixture style to the fixture resume (active style) ───────
  // The DSL render use case rejects the resume otherwise.
  await prisma.resume.update({
    where: { id: EXAMPLE_RESUME_ID },
    data: { styleId: EXAMPLE_GENERIC_ID },
  });

  // ── Mark the fixture resume as the user's primary resume ─────────────
  // Required by export PDF, /v1/jobs/:id/fit, and the min-quality guard.
  await prisma.user.update({
    where: { id: EXAMPLE_USER_ID },
    data: { primaryResumeId: EXAMPLE_RESUME_ID },
  });

  // ── ResumeQualityScoreHistory ≥ 70 (min-quality guard) ────────────────
  // The min-quality stage reads the latest row for the user's primary resume
  // and rejects with RESUME_QUALITY_TOO_LOW when overallScore < 70. Insert
  // a synthetic row so guard-protected mutations (resume tailor, auto-apply)
  // see a passing score. Idempotent via deleteMany + create.
  await prisma.resumeQualityScoreHistory.deleteMany({
    where: { resumeId: EXAMPLE_RESUME_ID, scoringRulesVersion: 'fixture-1.0.0' },
  });
  await prisma.resumeQualityScoreHistory.create({
    data: {
      resumeId: EXAMPLE_RESUME_ID,
      overallScore: 80,
      completenessScore: 80,
      contentQualityScore: 80,
      issuesJson: [],
      scoringRulesVersion: 'fixture-1.0.0',
    },
  });

  // ── ResumeShare (for {shareId} routes) ───────────────────────────────
  // The original share keeps its `${EXAMPLE_SLUG}-share` slug so admin
  // {shareId} routes resolve. A second share carries `EXAMPLE_SLUG` itself
  // so the public-resume routes (/v1/public/resumes/:slug,
  // /v1/dsl/render/public/:slug, /v1/public/resumes/:slug/download)
  // resolve to a real share when the param resolver fills `:slug` with
  // `fixture-slug`.
  await prisma.resumeShare.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      resumeId: EXAMPLE_RESUME_ID,
      slug: `${EXAMPLE_SLUG}-share`,
    },
    update: {},
  });

  const PUBLIC_SHARE_ID = '01900000-0000-7000-a000-000000000080';
  await prisma.resumeShare.upsert({
    where: { id: PUBLIC_SHARE_ID },
    create: {
      id: PUBLIC_SHARE_ID,
      resumeId: EXAMPLE_RESUME_ID,
      slug: EXAMPLE_SLUG,
      isActive: true,
    },
    update: { resumeId: EXAMPLE_RESUME_ID, slug: EXAMPLE_SLUG, isActive: true },
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
  // versionNumber is pinned to MAX_SAFE_INTEGER so the fixture row stays
  // inside the trailing 30-version window forever
  // (`CreateSnapshotUseCase.cleanupOldVersions` deletes anything past the
  // top 30 by versionNumber desc). Earlier values like 999_999 got pushed
  // out once the suite ran enough snapshot-creating probes that the
  // auto-incremented version numbers exceeded that ceiling.
  const FIXTURE_VERSION_NUMBER = 2_000_000_000;
  const existingFixtureVersionNumber = await prisma.resumeVersion.findUnique({
    where: {
      resumeId_versionNumber: {
        resumeId: EXAMPLE_RESUME_ID,
        versionNumber: FIXTURE_VERSION_NUMBER,
      },
    },
    select: { id: true },
  });
  if (existingFixtureVersionNumber && existingFixtureVersionNumber.id !== EXAMPLE_GENERIC_ID) {
    await prisma.resumeVersion.delete({ where: { id: existingFixtureVersionNumber.id } });
  }
  await prisma.resumeVersion.upsert({
    where: { id: EXAMPLE_GENERIC_ID },
    create: {
      id: EXAMPLE_GENERIC_ID,
      resumeId: EXAMPLE_RESUME_ID,
      versionNumber: FIXTURE_VERSION_NUMBER,
      snapshot: {},
    },
    update: { versionNumber: FIXTURE_VERSION_NUMBER },
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

  // ── UserFitProfile (for routes guarded by `fit-profile` + match BC) ──
  // The fit-profile stage admits the user only when status === 'responded',
  // which requires (a) a UserFitProfile row, (b) a non-null vector, and
  // (c) `expiresAt` in the future. Match use cases also require the same
  // row for the requester. The vector shape is loose JSON so any non-empty
  // structure satisfies the persisted contract.
  const fitVectorJson = {
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
  const fitExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  await prisma.userFitProfile.upsert({
    where: { userId: EXAMPLE_USER_ID },
    create: {
      userId: EXAMPLE_USER_ID,
      vectorJson: fitVectorJson,
      version: 1,
      expiresAt: fitExpiresAt,
    },
    update: { vectorJson: fitVectorJson, version: 1, expiresAt: fitExpiresAt },
  });

  // Admin also needs a UserFitProfile because the contract suite picks the
  // admin persona for /v1/automation/rage-apply (its permission isn't in
  // the `user` role's groups, so swagger marks it admin-only). The
  // fit-profile guard then 403s without this row.
  await prisma.userFitProfile.upsert({
    where: { userId: participantTwoUserId },
    create: {
      userId: participantTwoUserId,
      vectorJson: fitVectorJson,
      version: 1,
      expiresAt: fitExpiresAt,
    },
    update: { vectorJson: fitVectorJson, version: 1, expiresAt: fitExpiresAt },
  });

  // ── ResumeCollaborator (for PATCH /resumes/:resumeId/collaborators/:userId) ─
  // The path resolver fills both `:resumeId` and `:userId` with their fixture
  // constants, so the collaborator is the fixture user themself. The owner
  // check inside the use case is satisfied because requester = owner.
  await prisma.resumeCollaborator.upsert({
    where: { resumeId_userId: { resumeId: EXAMPLE_RESUME_ID, userId: EXAMPLE_USER_ID } },
    create: {
      resumeId: EXAMPLE_RESUME_ID,
      userId: EXAMPLE_USER_ID,
      role: CollaboratorRole.EDITOR,
      invitedBy: EXAMPLE_USER_ID,
      joinedAt: new Date(),
    },
    update: { role: CollaboratorRole.EDITOR },
  });

  // ── Resume skill SectionItem (for PATCH/DELETE /resumes/:resumeId/skills/:skillId) ─
  // The update use case looks up a SectionItem by `:skillId`, asserts that the
  // parent ResumeSection's SectionType.key === 'skill_set_v1'. We materialise
  // a `skill_set_v1` section on the fixture resume + a SectionItem with id =
  // EXAMPLE_GENERIC_ID. The seed is best-effort: if `skill_set_v1` is absent
  // (e.g. minimal local seed) the block is skipped rather than crashing.
  const skillSectionType = await prisma.sectionType.findUnique({
    where: { key: 'skill_set_v1' },
  });
  if (skillSectionType) {
    const SKILL_SECTION_ID = '01900000-0000-7000-a000-000000000081';
    await prisma.resumeSection.upsert({
      where: {
        resumeId_sectionTypeId: {
          resumeId: EXAMPLE_RESUME_ID,
          sectionTypeId: skillSectionType.id,
        },
      },
      create: {
        id: SKILL_SECTION_ID,
        resumeId: EXAMPLE_RESUME_ID,
        sectionTypeId: skillSectionType.id,
        order: 0,
        isVisible: true,
      },
      update: {},
    });
    const skillSectionRow = await prisma.resumeSection.findUnique({
      where: {
        resumeId_sectionTypeId: {
          resumeId: EXAMPLE_RESUME_ID,
          sectionTypeId: skillSectionType.id,
        },
      },
    });
    if (skillSectionRow) {
      await prisma.sectionItem.upsert({
        where: { id: EXAMPLE_GENERIC_ID },
        create: {
          id: EXAMPLE_GENERIC_ID,
          resumeSectionId: skillSectionRow.id,
          content: { name: 'TypeScript', category: 'language', level: 4 },
          order: 0,
          isVisible: true,
        },
        update: { resumeSectionId: skillSectionRow.id },
      });
    }
  } else {
    console.log('⚠️  Skipping resume skill SectionItem fixture: skill_set_v1 SectionType missing');
  }

  // ── TwoFactorAuth (for POST /v1/auth/2fa/verify) ──────────────────────
  // The route requires an existing TwoFactorAuth row whose secret a TOTP
  // probe could match. We store a deterministic test secret; the contract
  // probe still posts an arbitrary code (likely fails the totp check at the
  // application level — that's acceptable, the route returns 401 in that
  // case which the contract suite tolerates). Importantly, the row exists,
  // so the response is no longer the upstream-blocking 404.
  await prisma.twoFactorAuth.upsert({
    where: { userId: EXAMPLE_USER_ID },
    create: {
      userId: EXAMPLE_USER_ID,
      secret: 'JBSWY3DPEHPK3PXP',
      enabled: false,
    },
    update: { secret: 'JBSWY3DPEHPK3PXP', enabled: false },
  });

  // ── Recruiting opt-in fixtures (for POST /v1/recruiting/match-candidates) ─
  // The pool is computed from `User.preferences.profileVisibility ∈
  // {public, link}` AND `isActive` AND `onboardingCompletedAt`. The
  // requester (EXAMPLE_USER_ID) is excluded, so we flip the generic and
  // no-perms users to opt-in. We also seed minimal `primaryStack` entries
  // on their primaryResume so the cohort/recruiting algorithms have data.
  await prisma.userPreferences.upsert({
    where: { userId: EXAMPLE_USER_ID },
    create: { userId: EXAMPLE_USER_ID, profileVisibility: 'public' },
    update: { profileVisibility: 'public' },
  });
  await prisma.userPreferences.upsert({
    where: { userId: DREDD_GENERIC_USER_ID },
    create: { userId: DREDD_GENERIC_USER_ID, profileVisibility: 'public' },
    update: { profileVisibility: 'public' },
  });
  await prisma.userPreferences.upsert({
    where: { userId: DREDD_NOPERMS_USER_ID },
    create: { userId: DREDD_NOPERMS_USER_ID, profileVisibility: 'link' },
    update: { profileVisibility: 'link' },
  });

  // Career-graph cohort peers — give the generic + no-perms users primary
  // resumes whose `primaryStack` overlaps the example career-graph stack
  // ['typescript', 'postgresql', 'aws', 'kubernetes'] above the 60% Jaccard
  // threshold so the cohort is non-empty.
  const COHORT_PEER_RESUME_ONE_ID = '01900000-0000-7000-a000-000000000082';
  const COHORT_PEER_RESUME_TWO_ID = '01900000-0000-7000-a000-000000000083';
  await prisma.resume.upsert({
    where: { id: COHORT_PEER_RESUME_ONE_ID },
    create: {
      id: COHORT_PEER_RESUME_ONE_ID,
      userId: DREDD_GENERIC_USER_ID,
      title: 'Cohort Peer Resume',
      jobTitle: 'Senior Engineer',
      language: 'pt-br',
      primaryStack: ['typescript', 'postgresql', 'aws', 'kubernetes'],
      experienceYears: 6,
    },
    update: {
      primaryStack: ['typescript', 'postgresql', 'aws', 'kubernetes'],
      experienceYears: 6,
    },
  });
  await prisma.user.update({
    where: { id: DREDD_GENERIC_USER_ID },
    data: { primaryResumeId: COHORT_PEER_RESUME_ONE_ID },
  });
  await prisma.resume.upsert({
    where: { id: COHORT_PEER_RESUME_TWO_ID },
    create: {
      id: COHORT_PEER_RESUME_TWO_ID,
      userId: DREDD_NOPERMS_USER_ID,
      title: 'Cohort Peer Resume Two',
      jobTitle: 'Staff Engineer',
      language: 'pt-br',
      primaryStack: ['typescript', 'postgresql', 'aws', 'kubernetes'],
      experienceYears: 8,
    },
    update: {
      primaryStack: ['typescript', 'postgresql', 'aws', 'kubernetes'],
      experienceYears: 8,
    },
  });
  await prisma.user.update({
    where: { id: DREDD_NOPERMS_USER_ID },
    data: { primaryResumeId: COHORT_PEER_RESUME_TWO_ID },
  });

  // ── Generic-id job: keep authored by the fixture user ────────────────
  // We deliberately do NOT re-point this job to the admin: while that
  // would unblock POST /v1/jobs/:id/apply (CANNOT_APPLY_TO_OWN_JOB), it
  // simultaneously regresses PATCH /v1/jobs/:id and
  // GET /v1/jobs/:id/applications because the user-persona contract
  // probes are no longer the job's author. The third-party job below
  // (FIXTURE_THIRDPARTY_JOB_ID, owned by admin) is referenced by the
  // /v1/jobs/:id/apply contract probe via a per-route params override
  // so apply succeeds without breaking the owner-only routes.

  // ── Third-party job (owned by admin) for /v1/jobs/:id/apply ──────────
  // POST /v1/jobs/:id/apply must hit a job NOT authored by the requester
  // to avoid CANNOT_APPLY_TO_OWN_JOB. The route descriptor's params
  // example overrides `:id` to this constant.
  await prisma.job.upsert({
    where: { id: FIXTURE_THIRDPARTY_JOB_ID },
    create: {
      id: FIXTURE_THIRDPARTY_JOB_ID,
      authorId: participantTwoUserId,
      title: 'Dredd Third-Party Job',
      company: 'Third Party Co',
      jobType: JobType.FULL_TIME,
      description: 'Third-party fixture job for the apply route contract probe.',
      requirements: [],
      skills: [],
    },
    update: { authorId: participantTwoUserId },
  });

  // ── Auth tokens (refresh / email-verification / password-reset) ──────
  // The contract probes for /v1/auth/refresh, /v1/auth/email-verification/verify
  // and /v1/auth/reset-password need real, unexpired token rows so the use
  // case validation passes. Token values are deterministic literals other
  // agents reference; expiry is well into the future.
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const emailVerifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const passwordResetExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.refreshToken.upsert({
    where: { id: FIXTURE_REFRESH_TOKEN_ID },
    create: {
      id: FIXTURE_REFRESH_TOKEN_ID,
      token: FIXTURE_REFRESH_TOKEN_VALUE,
      userId: EXAMPLE_USER_ID,
      expiresAt: refreshExpiresAt,
    },
    update: {
      token: FIXTURE_REFRESH_TOKEN_VALUE,
      userId: EXAMPLE_USER_ID,
      expiresAt: refreshExpiresAt,
      revokedAt: null,
    },
  });

  await prisma.emailVerificationToken.upsert({
    where: { id: FIXTURE_EMAIL_VERIFY_TOKEN_ID },
    create: {
      id: FIXTURE_EMAIL_VERIFY_TOKEN_ID,
      token: FIXTURE_EMAIL_VERIFY_TOKEN_VALUE,
      userId: EXAMPLE_USER_ID,
      email: FIXTURE_USER_EMAIL,
      expiresAt: emailVerifyExpiresAt,
    },
    update: {
      token: FIXTURE_EMAIL_VERIFY_TOKEN_VALUE,
      userId: EXAMPLE_USER_ID,
      email: FIXTURE_USER_EMAIL,
      expiresAt: emailVerifyExpiresAt,
      usedAt: null,
    },
  });

  // Dedicated reset-password fixture user (isolated from the other suite
  // users so the use case's `invalidateAllSessions` write doesn't 401-cascade
  // every subsequent JWT probe).
  await prisma.user.upsert({
    where: { id: FIXTURE_PW_RESET_USER_ID },
    create: {
      id: FIXTURE_PW_RESET_USER_ID,
      email: FIXTURE_PW_RESET_USER_EMAIL,
      name: 'Dredd Password Reset User',
      username: 'dredd-pwreset',
      passwordHash,
      emailVerified: new Date(),
      isActive: true,
      onboardingCompletedAt: new Date(),
      roles: ['role_user'],
    },
    update: { isActive: true, passwordHash },
  });

  await prisma.passwordResetToken.upsert({
    where: { id: FIXTURE_PW_RESET_TOKEN_ID },
    create: {
      id: FIXTURE_PW_RESET_TOKEN_ID,
      token: FIXTURE_PW_RESET_TOKEN_VALUE,
      userId: FIXTURE_PW_RESET_USER_ID,
      expiresAt: passwordResetExpiresAt,
    },
    update: {
      token: FIXTURE_PW_RESET_TOKEN_VALUE,
      userId: FIXTURE_PW_RESET_USER_ID,
      expiresAt: passwordResetExpiresAt,
      usedAt: null,
    },
  });

  // ── Grant `automation:rage_apply` permission to role_user ────────────
  // The fixture user has roles ['role_user'] and Permission.RAGE_APPLY
  // is required by /v1/automation/rage-apply. Editing system-roles.ts to
  // add it globally would change production behaviour, so we attach it
  // only to the seeded `user` role (idempotent).
  const rageApplyPermission = await prisma.permission.findUnique({
    where: { resource_action: { resource: 'automation', action: 'rage_apply' } },
  });
  const userRoleForRageApply = await prisma.role.findUnique({ where: { name: 'user' } });
  if (rageApplyPermission && userRoleForRageApply) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRoleForRageApply.id,
          permissionId: rageApplyPermission.id,
        },
      },
      create: { roleId: userRoleForRageApply.id, permissionId: rageApplyPermission.id },
      update: {},
    });
  }

  // ── Resume-tailor feature flag ───────────────────────────────────────
  // POST /v1/resumes/:resumeId/tailor uses `resumes.ai-rewrite` (the
  // closest registered flag). Force-enable it so the contract probe is
  // not gated by an admin OFF-toggle in CI.
  await prisma.featureFlag.upsert({
    where: { key: 'resumes.ai-rewrite' },
    create: {
      key: 'resumes.ai-rewrite',
      name: 'Reescrita por IA',
      description: 'IA reescreve o currículo para cada vaga (forced enabled by Dredd seed).',
      enabled: true,
    },
    update: { enabled: true },
  });

  // ── Toggleable feature flag for PATCH /v1/admin/feature-flags/:key ──
  // Distinct from the deprecated `EXAMPLE_SLUG` flag so the toggle test
  // doesn't have to fight with the legacy fixture's seeded state.
  // `deprecated: false` is explicit on update because the boot-time
  // BootstrapFlagsUseCase marks any non-registry key as deprecated, and
  // the toggle endpoint refuses to flip a deprecated flag.
  await prisma.featureFlag.upsert({
    where: { key: FIXTURE_TOGGLEABLE_FLAG_KEY },
    create: {
      key: FIXTURE_TOGGLEABLE_FLAG_KEY,
      name: 'Dredd Toggleable Flag',
      description: 'Materialised by the Dredd seed for the admin toggle contract probe.',
      enabled: true,
      deprecated: false,
    },
    update: { enabled: true, deprecated: false },
  });

  // ── ResumeSection + SectionItem under `fixture-slug` SectionType ─────
  // PATCH/DELETE /v1/resumes/:resumeId/sections/:sectionTypeKey/items/:itemId
  // contract probes resolve `:sectionTypeKey=fixture-slug` and need a
  // SectionItem whose parent ResumeSection points to the fixture-slug
  // SectionType. The route descriptor params example overrides `:itemId`
  // to `FIXTURE_SECTION_ITEM_ID` so the test hits this row.
  const fixtureSectionType = await prisma.sectionType.findUnique({
    where: { key: EXAMPLE_SLUG },
  });
  if (fixtureSectionType) {
    const FIXTURE_SECTION_ID = '01900000-0000-7000-a000-000000000086';
    const FIXTURE_SECTION_ITEM_ID = '01900000-0000-7000-a000-000000000087';
    await prisma.resumeSection.upsert({
      where: {
        resumeId_sectionTypeId: {
          resumeId: EXAMPLE_RESUME_ID,
          sectionTypeId: fixtureSectionType.id,
        },
      },
      create: {
        id: FIXTURE_SECTION_ID,
        resumeId: EXAMPLE_RESUME_ID,
        sectionTypeId: fixtureSectionType.id,
        order: 99,
        isVisible: true,
      },
      update: {},
    });
    const fixtureSectionRow = await prisma.resumeSection.findUnique({
      where: {
        resumeId_sectionTypeId: {
          resumeId: EXAMPLE_RESUME_ID,
          sectionTypeId: fixtureSectionType.id,
        },
      },
    });
    if (fixtureSectionRow) {
      await prisma.sectionItem.upsert({
        where: { id: FIXTURE_SECTION_ITEM_ID },
        create: {
          id: FIXTURE_SECTION_ITEM_ID,
          resumeSectionId: fixtureSectionRow.id,
          content: { title: 'Fixture Title' },
          order: 0,
          isVisible: true,
        },
        update: {
          resumeSectionId: fixtureSectionRow.id,
          content: { title: 'Fixture Title' },
        },
      });
    }
  }

  // ── Reset auth lockout state for fixture users ───────────────────────
  // The contract test SessionPool logs in as these users on every run.
  // PrismaLoginAttemptsAdapter computes the lock from the trailing chain
  // of failed LoginAttempt rows, so wiping them here guarantees the next
  // run starts unlocked even if a prior run hammered the wrong password.
  await prisma.loginAttempt.deleteMany({
    where: {
      email: {
        in: [FIXTURE_USER_EMAIL, DREDD_NOPERMS_EMAIL, DREDD_GENERIC_USER_EMAIL, JANEDOE_EMAIL],
      },
      success: false,
    },
  });

  // ── Clear stale state pollution from prior contract suite runs ───────
  // A prior probe run may have left FitAnswer rows / completed
  // FitQuestionSet rows / BlockedUser entries that flip later runs into
  // 409 territory. Wiping them here keeps each run deterministic.
  await prisma.fitAnswer.deleteMany({ where: { userId: EXAMPLE_USER_ID } });
  await prisma.fitQuestionSet.updateMany({
    where: { userId: EXAMPLE_USER_ID, completedAt: { not: null } },
    data: { completedAt: null },
  });
  await prisma.blockedUser.deleteMany({
    where: {
      OR: [{ blockerId: EXAMPLE_USER_ID }, { blockedId: EXAMPLE_USER_ID }],
    },
  });

  console.log(
    '✅ Seeded Dredd fixture entities (users/resume/jobs/posts/conversation/notification/feature-flag/catalog/shares/imports/versions/sections/comments/apply-mode/connections/webhooks/auth-tokens) and cleared lockout state + state pollution',
  );
}
