import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { hashToken } from '@/shared-kernel/crypto';
import { InvalidResetTokenException } from '../../../domain/exceptions';
import { PasswordResetTokenPort } from '../../../domain/ports';

const TOKEN_EXPIRATION_HOURS = 24;

/**
 * Persists SHA-256 *fingerprints* of password-reset tokens (column name kept
 * as `token` for backward compatibility; semantics changed in P0-#5 fix).
 * Plaintext only exists in the email sent to the user; a DB dump can never
 * be used to reset anyone's password.
 *
 * Migration note: existing rows from before this commit hold plaintext UUIDs
 * — those rows are silently invalidated (their plaintext won't equal the
 * sha256 lookup) and the user must re-request a reset email.
 */
export class PrismaPasswordResetTokenService implements PasswordResetTokenPort {
  constructor(private readonly prisma: PrismaService) {}

  async createToken(userId: string, plaintext: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRATION_HOURS);

    // Delete any existing tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId },
    });

    // Persist the fingerprint, never the plaintext.
    await this.prisma.passwordResetToken.create({
      data: { userId, token: hashToken(plaintext), expiresAt },
    });
  }

  async validateToken(plaintext: string): Promise<string> {
    const tokenHash = hashToken(plaintext);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!resetToken) {
      throw new InvalidResetTokenException();
    }

    if (new Date() > resetToken.expiresAt) {
      await this.prisma.passwordResetToken.deleteMany({
        where: { token: tokenHash },
      });
      throw new InvalidResetTokenException();
    }

    return resetToken.userId;
  }

  /**
   * Atomically validates and consumes a token using Prisma transaction.
   * This prevents race conditions where the same token could be used twice.
   */
  async validateAndConsumeToken(plaintext: string): Promise<string> {
    const tokenHash = hashToken(plaintext);
    return this.prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { token: tokenHash },
      });

      if (!resetToken) {
        throw new InvalidResetTokenException();
      }

      if (new Date() > resetToken.expiresAt) {
        await tx.passwordResetToken.deleteMany({
          where: { token: tokenHash },
        });
        throw new InvalidResetTokenException();
      }

      // Atomically consume - deleteMany returns count for race detection.
      const result = await tx.passwordResetToken.deleteMany({
        where: { token: tokenHash },
      });

      if (result.count === 0) {
        throw new InvalidResetTokenException();
      }

      return resetToken.userId;
    });
  }

  async invalidateToken(plaintext: string): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({
      where: { token: hashToken(plaintext) },
    });
  }
}
