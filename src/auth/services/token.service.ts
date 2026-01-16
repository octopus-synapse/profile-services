/**
 * Token Service
 * Single Responsibility: JWT token generation and validation
 *
 * Note: JWT payload does NOT contain role/permissions.
 * Permissions are resolved dynamically via AuthorizationService.
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtUserPayload {
  id: string;
  email: string;
  hasCompletedOnboarding: boolean;
}

export interface TokenPayload {
  sub: string;
  email: string;
  hasCompletedOnboarding: boolean;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(user: JwtUserPayload): string {
    if (!user.email) {
      throw new Error('User email is required for token generation');
    }

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };

    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): TokenPayload {
    return this.jwtService.verify<TokenPayload>(token);
  }

  decodeToken(token: string): TokenPayload | null {
    return this.jwtService.decode(token);
  }
}
