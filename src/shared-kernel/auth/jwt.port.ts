/**
 * Framework-free JWT signing + verification port. Wraps Nest's
 * `JwtService` today; future Bun/Elysia adapter plugs in `jose` or
 * `jsonwebtoken` directly. Application code consumes this port —
 * never `@nestjs/jwt`.
 */

export interface JwtSignOptions {
  readonly expiresIn?: string | number;
  readonly secret?: string;
  readonly audience?: string;
  readonly issuer?: string;
  readonly subject?: string;
  readonly notBefore?: string | number;
}

export interface JwtVerifyOptions {
  readonly secret?: string;
  readonly audience?: string | string[];
  readonly issuer?: string | string[];
}

export abstract class JwtPort {
  abstract sign(payload: object, options?: JwtSignOptions): string;
  abstract signAsync(payload: object, options?: JwtSignOptions): Promise<string>;
  abstract verify<T = unknown>(token: string, options?: JwtVerifyOptions): T;
  abstract verifyAsync<T = unknown>(token: string, options?: JwtVerifyOptions): Promise<T>;
  abstract decode<T = unknown>(token: string): T | null;
}
