/**
 * `UserSnapshotPort` impl backed by Prisma. Returns the per-request
 * gate flags the pipeline's email-verified + onboarding stages read.
 * The query is a single `findUnique` on `User` selecting only the
 * columns we need, so the per-request cost is one indexed lookup.
 */

import type { PrismaClient } from '@prisma/client';
import { type UserSnapshot, UserSnapshotPort } from '@/shared-kernel/http/user-snapshot.port';

export class PrismaUserSnapshotAdapter extends UserSnapshotPort {
  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  async get(userId: string): Promise<UserSnapshot | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        hasCompletedOnboarding: true,
      },
    });
    if (!row) return null;
    return {
      userId: row.id,
      email: row.email ?? '',
      emailVerified: row.emailVerified !== null,
      hasCompletedOnboarding: row.hasCompletedOnboarding,
    };
  }
}
