/**
 * Nest-side `JwtPort` adapter. Delegates to `@nestjs/jwt`'s
 * `JwtService`. Future framework adapters live next to this file
 * (e.g. `bun-jose-jwt.adapter.ts`).
 */

import { Injectable } from '@nestjs/common';
import { JwtService, type JwtSignOptions as NestSignOpts } from '@nestjs/jwt';
import {
  JwtPort,
  type JwtSignOptions,
  type JwtVerifyOptions,
} from '@/shared-kernel/auth/jwt.port';

@Injectable()
export class NestJwtAdapter extends JwtPort {
  constructor(private readonly jwt: JwtService) {
    super();
  }

  sign(payload: object, options?: JwtSignOptions): string {
    return this.jwt.sign(payload, options as NestSignOpts | undefined);
  }

  signAsync(payload: object, options?: JwtSignOptions): Promise<string> {
    return this.jwt.signAsync(payload, options as NestSignOpts | undefined);
  }

  verify<T = unknown>(token: string, options?: JwtVerifyOptions): T {
    return this.jwt.verify(
      token,
      options as Parameters<JwtService['verify']>[1],
    ) as T;
  }

  verifyAsync<T = unknown>(token: string, options?: JwtVerifyOptions): Promise<T> {
    return this.jwt.verifyAsync(
      token,
      options as Parameters<JwtService['verifyAsync']>[1],
    ) as Promise<T>;
  }

  decode<T = unknown>(token: string): T | null {
    const decoded = this.jwt.decode(token);
    if (decoded === null || typeof decoded === 'string') return null;
    return decoded as T;
  }
}
