import { PrismaClient } from '@prisma/client';
import { seedAuthorization } from '../src/bounded-contexts/identity/authorization/seeds/seed-runner';
import { createPrismaClientOptions } from '../src/bounded-contexts/platform/prisma/prisma-client-options';
import { seedAnalyticsProjections } from './seeds/analytics-projection.seed';
import { seedJobs } from './seeds/job.seed';
import { seedOnboardingSteps } from './seeds/onboarding-step.seed';
import { seedSectionTypes } from './seeds/section-type.seed';
import { seedSpokenLanguages } from './seeds/spoken-language.seed';
import { seedTechSkills } from './seeds/tech-skill.seed';
import { seedThemes } from './seeds/theme.seed';
import { seedUsernames } from './seeds/username.seed';

const prisma = new PrismaClient(createPrismaClientOptions());

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if admin already exists
  let admin = await prisma.user.findFirst({
    where: { email: process.env.ADMIN_EMAIL || 'admin@example.com' },
  });

  if (!admin) {
    // Create first admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';
    const adminName = process.env.ADMIN_NAME || 'Admin User';

    const hashedPassword = await Bun.password.hash(adminPassword, {
      algorithm: 'bcrypt',
      cost: 10,
    });

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        name: adminName,
        emailVerified: new Date(),
        roles: ['role_user', 'role_admin'],
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('\n⚠️  IMPORTANT: Change admin password after first login!');
  } else {
    // Ensure admin has role_admin in the roles array
    if (!admin.roles.includes('role_admin')) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { roles: ['role_user', 'role_admin'] },
      });
      console.log('✅ Admin user roles updated to include role_admin');
    }
    console.log('✅ Admin user already exists');
  }

  // Seed authorization (roles, permissions, groups)
  await seedAuthorization();

  // Assign admin role to admin user
  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  });

  if (adminRole) {
    await prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: adminRole.id,
        },
      },
      create: {
        userId: admin.id,
        roleId: adminRole.id,
      },
      update: {},
    });
    console.log('✅ Admin role assigned to admin user');
  }

  // Seed system themes
  await seedThemes(prisma, admin.id);

  // Seed spoken languages catalog
  await seedSpokenLanguages(prisma);

  // Seed semantic section types catalog
  await seedSectionTypes(prisma);

  // Seed onboarding flow config (steps, strength, examples)
  await seedOnboardingSteps(prisma);

  // Seed tech skills catalog (areas, niches, skills, programming languages)
  await seedTechSkills(prisma);

  // Seed jobs catalog
  await seedJobs(prisma, admin.id);

  // Seed usernames for existing users without one
  await seedUsernames(prisma);

  // Seed analytics projections from existing resumes
  await seedAnalyticsProjections(prisma);

  // Seed E2E test user for performance testing
  const e2eTestEmail = 'e2e-test@profile.local';
  const existingE2eUser = await prisma.user.findFirst({
    where: { email: e2eTestEmail },
  });

  if (!existingE2eUser) {
    const e2ePassword = 'E2E_Test_Password_123!';
    const hashedE2ePassword = await Bun.password.hash(e2ePassword, {
      algorithm: 'bcrypt',
      cost: 10,
    });

    await prisma.user.create({
      data: {
        email: e2eTestEmail,
        passwordHash: hashedE2ePassword,
        name: 'E2E Test User',
        username: 'e2e-test-user',
        emailVerified: new Date(),
        isActive: true,
        hasCompletedOnboarding: true,
      },
    });

    console.log('✅ E2E test user created successfully!');
    console.log(`📧 E2E Email: ${e2eTestEmail}`);
    console.log(`🔑 E2E Password: ${e2ePassword}`);
  } else {
    console.log('✅ E2E test user already exists');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
