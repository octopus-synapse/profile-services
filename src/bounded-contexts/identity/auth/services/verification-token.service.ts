/**
 * Verification Token Service
 * Single Responsibility: Create and validate verification tokens
 *
 * BUG-014 FIX: Now logs token deletion errors instead of silently ignoring
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  TIME_MS,
  TOKEN_EXPIRY,
  ERROR_MESSAGES,
  CRYPTO_CONSTANTS,
} from '@octopus-synapse/profile-contracts';

const RESET_TOKEN_PREFIX = 'reset:';

export interface VerificationResult {
  email: string;
  isValid: boolean;
}

@Injectable()
export class VerificationTokenService {
  private readonly logger = new Logger(VerificationTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createEmailVerificationToken(email: string): Promise<string> {
    const token = this.generateToken();
    const expires = this.calculateExpiry(TOKEN_EXPIRY.EMAIL_VERIFICATION_HOURS);

    await this.upsertToken(email, token, expires);

    return token;
  }

  async createPasswordResetToken(email: string): Promise<string> {
    const token = this.generateToken();
    const expires = this.calculateExpiry(TOKEN_EXPIRY.PASSWORD_RESET_HOURS);
    const identifier = `${RESET_TOKEN_PREFIX}${email}`;

    await this.upsertToken(identifier, token, expires);

    return token;
  }

  async validateEmailVerificationToken(token: string): Promise<string> {
    const verificationToken = await this.findToken(token);

    if (!verificationToken) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_VERIFICATION_TOKEN);
    }

    this.validateExpiry(verificationToken.expires, token);

    const email = verificationToken.identifier;
    await this.deleteToken(token);

    return email;
  }

  async validatePasswordResetToken(token: string): Promise<string> {
    const verificationToken = await this.findToken(token);

    if (!verificationToken?.identifier.startsWith(RESET_TOKEN_PREFIX)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_RESET_TOKEN);
    }

    this.validateExpiry(verificationToken.expires, token);

    const email = verificationToken.identifier.replace(RESET_TOKEN_PREFIX, '');
    await this.deleteToken(token);

    return email;
  }

  private generateToken(): string {
    return crypto.randomBytes(CRYPTO_CONSTANTS.TOKEN_BYTES).toString('hex');
  }

  private calculateExpiry(hours: number): Date {
    return new Date(Date.now() + hours * TIME_MS.HOUR);
  }

  private async upsertToken(
    identifier: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
      update: {
        token,
        expires,
      },
      create: {
        identifier,
        token,
        expires,
      },
    });
  }

  private async findToken(token: string) {
    return this.prisma.verificationToken.findUnique({
      where: { token },
    });
  }

  private async deleteToken(token: string): Promise<void> {
    await this.prisma.verificationToken.delete({
      where: { token },
    });
  }

  private validateExpiry(expires: Date, token: string): void {
    if (expires < new Date()) {
      // BUG-014 FIX: Log deletion errors instead of silently ignoring
      this.deleteToken(token).catch((error: Error) => {
        this.logger.warn(
          `Failed to delete expired token: ${error.message}`,
          'VerificationTokenService',
        );
      });
      throw new BadRequestException(ERROR_MESSAGES.TOKEN_EXPIRED);
    }
  }
}
