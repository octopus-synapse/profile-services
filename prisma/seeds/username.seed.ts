import { PrismaClient } from '@prisma/client';

/**
 * Generate username from email
 * Extracts the part before @ and normalizes it
 */
function generateUsernameFromEmail(email: string): string {
  // Get part before @
  const localPart = email.split('@')[0];

  // Normalize: lowercase, replace dots and special chars with underscore, remove invalid chars
  let username = localPart
    .toLowerCase()
    .replace(/[.+-]/g, '_') // Replace dots, plus, hyphens with underscore
    .replace(/[^a-z0-9_]/g, '') // Remove any other invalid characters
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

  // Ensure minimum length of 3
  if (username.length < 3) {
    username = username.padEnd(3, '0');
  }

  // Ensure maximum length of 30
  if (username.length > 30) {
    username = username.substring(0, 30);
  }

  return username;
}

/**
 * Find a unique username by appending numbers if needed
 */
async function findUniqueUsername(
  prisma: PrismaClient,
  baseUsername: string,
): Promise<string> {
  let username = baseUsername;
  let counter = 1;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existing) {
      return username;
    }

    // Append counter and try again
    const suffix = String(counter);
    const maxBaseLength = 30 - suffix.length;
    username = baseUsername.substring(0, maxBaseLength) + suffix;
    counter++;

    // Safety limit
    if (counter > 10000) {
      throw new Error(`Could not find unique username for base: ${baseUsername}`);
    }
  }
}

/**
 * Seed usernames for existing users that don't have one
 * Uses the email prefix to generate usernames
 */
export async function seedUsernames(prisma: PrismaClient): Promise<void> {
  console.log('\n👤 Seeding usernames for existing users...');

  // Find all users without username
  const usersWithoutUsername = await prisma.user.findMany({
    where: {
      username: null,
      email: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (usersWithoutUsername.length === 0) {
    console.log('✅ All users already have usernames');
    return;
  }

  console.log(`📊 Found ${usersWithoutUsername.length} users without username`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of usersWithoutUsername) {
    try {
      if (!user.email) {
        console.log(`⚠️  User ${user.id} has no email, skipping`);
        continue;
      }

      const baseUsername = generateUsernameFromEmail(user.email);
      const uniqueUsername = await findUniqueUsername(prisma, baseUsername);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          username: uniqueUsername,
          // Don't set usernameUpdatedAt so users can change it immediately
        },
      });

      successCount++;
      console.log(`  ✓ ${user.email} → @${uniqueUsername}`);
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Error processing user ${user.id}:`, error);
    }
  }

  console.log(`\n✅ Username seeding complete:`);
  console.log(`   Success: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount}`);
  }
}
