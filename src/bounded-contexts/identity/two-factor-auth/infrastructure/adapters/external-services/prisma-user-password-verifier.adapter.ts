/**
 * Reads the user's password hash from prisma.user and compares it against a
 * plaintext via `Bun.password.verify` (bcrypt). Used by `Disable2faUseCase`
 * to re-prove credential ownership.
 *
 * The hash format is whatever `bcrypt-password.hasher.ts` (account-lifecycle
 * BC) wrote at signup; `Bun.password.verify` auto-detects.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { UserPasswordVerifierPort } from '../../../domain/ports/user-password-verifier.port';

export class PrismaUserPasswordVerifier extends UserPasswordVerifierPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async verifyPassword(userId: string, plaintext: string): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!row?.passwordHash) return false;
    return Bun.password.verify(plaintext, row.passwordHash);
  }
}
