import type { PrismaClient } from '@prisma/client';

/**
 * Dev/E2E seed: creates a fixture user representing the
 * **verified + NOT onboarded** state. The patch-careers-ui e2e suite
 * uses this user via `loginAsUnonboardedUser(browser)` in
 * `_helpers/auth.ts` to drive the onboarding stepper specs without
 * first dancing through the email-verification gate.
 *
 * Distinctive state vs. other fixtures:
 *   emailVerified:           non-null (passes verify-email gate)
 *   onboardingCompletedAt:   null     (frontend still wants to onboard)
 *   UserRoleAssignment:      ABSENT   (the `user` role is granted by
 *                                      `onboarding-completion.adapter.ts`
 *                                      when the user finishes the
 *                                      stepper — production behaviour)
 *   roles[]:                 []       (legacy denormalised mirror)
 *   resume:                  none     (stepper creates the master CV)
 *   username:                null     (assigned during onboarding)
 *
 * Idempotent: re-runs upsert by email. No role assignment to repair —
 * the test of the onboarding-completion flow itself asserts the role
 * grant happens; pre-seeding it would defeat the purpose.
 */
export async function seedE2EOnboardingUser(prisma: PrismaClient): Promise<void> {
  const email = 'e2e-onboarding@profile.local';
  const password = 'E2E_Onboarding_123!';

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    // Repair-on-rerun: if a prior run somehow set onboardingCompletedAt
    // (e.g. a test ran the completion endpoint against this fixture),
    // reset it so the next test run sees the documented state.
    if (existing.onboardingCompletedAt !== null || existing.roles.length > 0) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { onboardingCompletedAt: null, roles: [], primaryResumeId: null },
      });
      console.log(`✅ Seed user '${email}' state reset to unonboarded`);
    } else {
      console.log(`✅ Seed user '${email}' already exists`);
    }

    // Also drop any leaked UserRoleAssignment rows — the fixture must
    // not carry the `user` role until a test exercises onboarding
    // completion against it.
    await prisma.userRoleAssignment.deleteMany({ where: { userId: existing.id } });
    return;
  }

  const passwordHash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'E2E Onboarding User',
      // username intentionally left null — the onboarding stepper will
      // ask the user to pick one.
      emailVerified: new Date(),
      isActive: true,
      // onboardingCompletedAt left null (default) — this is the whole
      // point of this fixture.
      // roles[] left empty (default) — see file header.
    },
  });

  console.log('✅ E2E onboarding fixture user created');
  console.log(`   📧 ${email}`);
  console.log(`   🔑 ${password}`);
  console.log('   state: verified, NOT onboarded, no role assignment');
}
