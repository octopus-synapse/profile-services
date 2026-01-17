/**
 * Verification Token Service
 * Single Responsibility: Create and validate verification tokens
 *
 * BUG-014 FIX: Now logs token deletion errors instead of silently ignoring
 */

import { Injectable, Logger } from '@nestjs/common';
import { InvalidTokenError } from '@octopus-synapse/profile-contracts';
import * as crypto from 'crypto';
import {
  TIME_MS,
  TOKEN_EXPIRY,
  CRYPTO_CONSTANTS,
} from '@octopus-synapse/profile-contracts';
import { VerificationTokenRepository } from '../repositories';

const RESET_TOKEN_PREFIX = 'reset:';

export interface VerificationResult {
  email: string;
  isValid: boolean;
}

@Injectable()
export class VerificationTokenService {
  private readonly logger = new Logger(VerificationTokenService.name);

  constructor(private readonly tokenRepo: VerificationTokenRepository) {}

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
      throw new InvalidTokenError('verification token not found');
    }

    this.validateExpiry(verificationToken.expires, token);

    const email = verificationToken.identifier;
    await this.deleteToken(token);

    return email;
  }

  async validatePasswordResetToken(token: string): Promise<string> {
    const verificationToken = await this.findToken(token);

    if (!verificationToken?.identifier.startsWith(RESET_TOKEN_PREFIX)) {
      throw new InvalidTokenError('password reset token not found or invalid');
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
    await this.tokenRepo.upsert({ identifier, token, expires });
  }

  private async findToken(token: string) {
    return this.tokenRepo.findByToken(token);
  }

  private async deleteToken(token: string): Promise<void> {
    await this.tokenRepo.deleteByToken(token);
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
      throw new InvalidTokenError('expired');
    }
  }
}
