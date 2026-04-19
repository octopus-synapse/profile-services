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
      hasCompletedOnboarding: true,
      onboardingCompletedAt: new Date(),
      phone: '+55 11 99999-0000',
      location: 'São Paulo, SP',
      bio: 'Software engineer building tools for other engineers.',
      github: 'enzoferracini',
      linkedin: 'enzoferracini',
    },
  });

  // Typst PDF generation requires an active theme on the resume.
  const defaultTheme = await prisma.resumeTheme.findFirst({
    where: { isSystemTheme: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!defaultTheme) {
    throw new Error(
      "Cannot seed 'enzoferracini': no system theme found. Run seedThemes before this seed.",
    );
  }

  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: 'Enzo Ferracini — Resume',
      fullName: 'Enzo Ferracini',
      jobTitle: 'Software Engineer',
      phone: '+55 11 99999-0000',
      emailContact: email,
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
      activeThemeId: defaultTheme.id,
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
