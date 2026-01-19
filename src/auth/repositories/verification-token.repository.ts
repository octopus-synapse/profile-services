/**
 * Verification Token Repository
 * Single Responsibility: Token storage for email verification and password reset
 */

import { Injectable } from '@nestjs/common';
import { VerificationToken } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CreateTokenData = {
  identifier: string;
  token: string;
  expires: Date;
};

@Injectable()
export class VerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find token by identifier (email) - returns the most recent token
   */
  async findByIdentifier(
    identifier: string,
  ): Promise<VerificationToken | null> {
    return this.prisma.verificationToken.findFirst({
      where: { identifier },
      orderBy: { expires: 'desc' },
    });
  }

  /**
   * Find token by token value
   */
  async findByToken(token: string): Promise<VerificationToken | null> {
    return this.prisma.verificationToken.findUnique({
      where: { token },
    });
  }

  /**
   * Create or update verification token using composite key
   * Uses upsert to handle re-sending tokens
   */
  async upsert(data: CreateTokenData): Promise<VerificationToken> {
    return this.prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: data.identifier,
          token: data.token,
        },
      },
      update: {
        token: data.token,
        expires: data.expires,
      },
      create: data,
    });
  }

  /**
   * Delete token by token value
   */
  async deleteByToken(token: string): Promise<void> {
    await this.prisma.verificationToken.delete({
      where: { token },
    });
  }

  /**
   * Check if token is expired
   */
  isExpired(token: VerificationToken): boolean {
    return token.expires < new Date();
  }
}
