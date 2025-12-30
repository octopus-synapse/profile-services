/**
 * Token Service
 * Single Responsibility: JWT token generation and validation
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

export type JwtUserPayload = Pick<
  User,
  'id' | 'email' | 'role' | 'hasCompletedOnboarding'
>;

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  hasCompletedOnboarding: boolean;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(user: JwtUserPayload): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email!,
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
    };

    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): TokenPayload {
    return this.jwtService.verify<TokenPayload>(token);
  }

  decodeToken(token: string): TokenPayload | null {
    return this.jwtService.decode(token) as TokenPayload | null;
  }
}
