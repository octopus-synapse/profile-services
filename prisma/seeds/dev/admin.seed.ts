import type { PrismaClient } from '@prisma/client';

/**
 * Dev admin bootstrap. Creates (or repairs) the local admin user and assigns
 * the `admin` role. Requires authorization (roles) to have been seeded first.
 * Returns the admin id for the dev catalogs that need an owner (resume styles,
 * jobs, dredd fixtures). DEV-ONLY: never run in production (would install a real
 * account row with a known password).
 */
export async function seedAdminUser(prisma: PrismaClient): Promise<{ id: string }> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  let admin = await prisma.user.findFirst({ where: { email: adminEmail } });

  if (!admin) {
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
        onboardingCompletedAt: new Date(),
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('\n⚠️  IMPORTANT: Change admin password after first login!');
  } else {
    if (!admin.roles.includes('role_admin')) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { roles: ['role_user', 'role_admin'] },
      });
      console.log('✅ Admin user roles updated to include role_admin');
    }
    if (admin.onboardingCompletedAt === null) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { onboardingCompletedAt: new Date() },
      });
      console.log('✅ Admin user onboarding timestamp set');
    }
    console.log('✅ Admin user already exists');
  }

  // Assign the `admin` role (authorization must already be seeded).
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (adminRole) {
    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      create: { userId: admin.id, roleId: adminRole.id },
      update: {},
    });
    console.log('✅ Admin role assigned to admin user');
  }

  return { id: admin.id };
}
