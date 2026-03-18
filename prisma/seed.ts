import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedAuthorization } from '../src/bounded-contexts/identity/authorization/seeds/seed-runner';
import { createPrismaClientOptions } from '../src/bounded-contexts/platform/prisma/prisma-client-options';
import { seedAnalyticsProjections } from './seeds/analytics-projection.seed';
import { seedSectionTypes } from './seeds/section-type.seed';
import { seedSpokenLanguages } from './seeds/spoken-language.seed';
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

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        name: adminName,
        emailVerified: new Date(),
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('\n⚠️  IMPORTANT: Change admin password after first login!');
  } else {
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

  // Seed usernames for existing users without one
  await seedUsernames(prisma);

  // Seed analytics projections from existing resumes
  await seedAnalyticsProjections(prisma);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
