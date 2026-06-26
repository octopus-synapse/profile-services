import type { PrismaClient } from '@prisma/client';

/**
 * E2E performance-test user (verified + onboarded). DEV-ONLY. The `user` role is
 * assigned explicitly because this fixture shortcuts onboarding via
 * `onboardingCompletedAt` (which normally grants it). Idempotent.
 */
export async function seedE2ETestUser(prisma: PrismaClient): Promise<void> {
  const e2eTestEmail = 'e2e-test@profile.local';
  let e2eUser = await prisma.user.findFirst({ where: { email: e2eTestEmail } });

  if (!e2eUser) {
    const e2ePassword = 'E2E_Test_Password_123!';
    const hashedE2ePassword = await Bun.password.hash(e2ePassword, {
      algorithm: 'bcrypt',
      cost: 10,
    });

    e2eUser = await prisma.user.create({
      data: {
        email: e2eTestEmail,
        passwordHash: hashedE2ePassword,
        name: 'E2E Test User',
        username: 'e2e-test-user',
        emailVerified: new Date(),
        isActive: true,
        onboardingCompletedAt: new Date(),
      },
    });

    console.log('✅ E2E test user created successfully!');
    console.log(`📧 E2E Email: ${e2eTestEmail}`);
    console.log(`🔑 E2E Password: ${e2ePassword}`);
  } else {
    console.log('✅ E2E test user already exists');
  }

  const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
  if (userRole) {
    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId: e2eUser.id, roleId: userRole.id } },
      create: { userId: e2eUser.id, roleId: userRole.id, assignedBy: 'seed' },
      update: {},
    });
  }
}
