import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedAnalyticsProjections } from './seeds/analytics-projection.seed';
import { seedSpokenLanguages } from './seeds/spoken-language.seed';
import { seedThemes } from './seeds/theme.seed';
import { seedUsernames } from './seeds/username.seed';

const prisma = new PrismaClient();

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
        password: hashedPassword,
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

  // Seed system themes
  await seedThemes(prisma, admin.id);

  // Seed spoken languages catalog
  await seedSpokenLanguages(prisma);

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
