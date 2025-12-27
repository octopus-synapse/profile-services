import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists, skipping seed');
    return;
  }

  // Create first admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';
  const adminName = process.env.ADMIN_NAME || 'Admin User';

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log(`📧 Email: ${admin.email}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log(
    '\n⚠️  IMPORTANT: Please change the admin password after first login!',
  );
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
