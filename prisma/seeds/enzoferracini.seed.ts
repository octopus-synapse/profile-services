import type { PrismaClient } from '@prisma/client';

/**
 * Dev/E2E seed: creates the `enzoferracini` user with a public resume.
 *
 * The patch-careers-ui e2e test `resume-download.spec.ts` depends on:
 *   - GET /api/v1/users/enzoferracini/profile → 200 with user.id
 *   - GET /api/v1/export/user/:id/resume/pdf → a 1-page PDF
 *
 * Idempotent: if the user already exists, the seed is a no-op.
 */
export async function seedEnzoferracini(prisma: PrismaClient): Promise<void> {
  const username = 'enzoferracini';
  const email = 'enzo@patchcareers.local';
  const password = 'Enzo_Test_123!';

  const existing = await prisma.user.findFirst({ where: { username } });
  if (existing) {
    // Repair-on-rerun: if a prior seed (before the role-grant fix) left
    // the user without a UserRoleAssignment, grant the `user` role now
    // so domain permissions (feed:use, resume:create, …) become available.
    const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
    if (userRole) {
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: existing.id, roleId: userRole.id } },
        create: { userId: existing.id, roleId: userRole.id, assignedBy: 'seed' },
        update: {},
      });
    }
    console.log(`✅ Seed user '${username}' already exists`);
    return;
  }

  const passwordHash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Enzo Ferracini',
      username,
      emailVerified: new Date(),
      isActive: true,
      onboardingCompletedAt: new Date(),
      phone: '+55 11 99999-0000',
      location: 'São Paulo, SP',
      bio: 'Software engineer building tools for other engineers.',
      github: 'enzoferracini',
      linkedin: 'enzoferracini',
      // Job-seeker marker — required for onboarding + fit-profile + match gates.
      roles: ['role_user', 'role_user_standard'],
    },
  });

  // Pre-completing onboarding here skips the onboarding-complete use case,
  // which is normally what grants the `user` role in UserRoleAssignment.
  // Without this row the permission gate denies every domain perm
  // (resume:create, feed:use, social:use, …). Mirror the same role grant
  // the onboarding-completion adapter performs in production.
  const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
  if (userRole) {
    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId: user.id, roleId: userRole.id } },
      create: { userId: user.id, roleId: userRole.id, assignedBy: 'seed' },
      update: {},
    });
  }

  // Typst PDF generation requires an active style on the resume.
  const defaultStyle = await prisma.resumeStyle.findFirst({
    where: { isSystem: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!defaultStyle) {
    throw new Error(
      "Cannot seed 'enzoferracini': no system resume style found. Run seedResumeStyles before this seed.",
    );
  }

  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: 'Enzo Ferracini — Resume',
      fullName: 'Enzo Ferracini',
      jobTitle: 'Software Engineer',
      phone: '+55 11 99999-0000',
      location: 'São Paulo, SP',
      linkedin: 'enzoferracini',
      github: 'enzoferracini',
      summary:
        'Software engineer focused on developer tooling, API design, and scalable backends. ' +
        'Comfortable across the stack with a preference for TypeScript, Svelte, and PostgreSQL.',
      isPublic: true,
      slug: username,
      primaryLanguage: 'pt-br',
      language: 'pt-br',
      styleId: defaultStyle.id,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { primaryResumeId: resume.id },
  });

  console.log(`✅ Seed user '${username}' created`);
  console.log(`   📧 ${email}`);
  console.log(`   🔑 ${password}`);
  console.log(`   📄 primaryResumeId: ${resume.id}`);
}
