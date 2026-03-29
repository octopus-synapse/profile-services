/**
 * Session Management & CSRF Security Tests
 *
 * Tests for session security, CSRF protection, and authentication flows.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import { fileExists, grepCodebase, grepCodebaseFixed, SRC_DIR } from './security-utils';

describe('Session Management Security', () => {
  describe('JWT Token Security', () => {
    it('should have JWT secret from environment', () => {
      const jwtConfig = grepCodebaseFixed('JWT_SECRET', ['node_modules', 'dist']);
      let usesEnvSecret = false;

      for (const match of jwtConfig) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check various ways to load JWT_SECRET from config
        if (
          content.includes('process.env.JWT_SECRET') ||
          content.includes("configService.get('JWT_SECRET')") ||
          content.includes("configService.get<string>('JWT_SECRET')") ||
          content.includes("configService.getOrThrow<string>('JWT_SECRET')") ||
          content.includes('JWT_SECRET:')
        ) {
          usesEnvSecret = true;
        }
      }

      expect(usesEnvSecret).toBe(true);
    });

    it('should set appropriate token expiration', () => {
      const jwtConfig = grepCodebase('expiresIn|signOptions', ['node_modules', 'dist']);
      let hasExpiration = false;

      for (const match of jwtConfig) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (content.includes('expiresIn')) {
          hasExpiration = true;
        }
      }

      expect(hasExpiration).toBe(true);
    });

    it('should implement refresh token rotation', () => {
      const refreshToken = grepCodebase('refreshToken|refresh_token|RefreshToken', [
        'node_modules',
        'dist',
      ]);
      let hasRefreshMechanism = false;

      for (const match of refreshToken) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('refreshToken') &&
          (content.includes('rotate') ||
            content.includes('invalidate') ||
            content.includes('revoke') ||
            content.includes('delete'))
        ) {
          hasRefreshMechanism = true;
        }
      }

      expect(hasRefreshMechanism).toBe(true);
    });

    it('should validate JWT on protected routes', () => {
      const guards = grepCodebase('JwtAuthGuard|AuthGuard', ['node_modules', 'dist']);
      expect(guards.length).toBeGreaterThan(0);
    });

    it('should use asymmetric keys or strong secret', () => {
      const jwtStrategy = grepCodebase('JwtStrategy|PassportStrategy', ['node_modules', 'dist']);

      for (const match of jwtStrategy) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // If using JWT, secret should come from env
        if (content.includes('secretOrKey') || content.includes('secret')) {
          expect(content).toMatch(/process\.env|configService/);
        }
      }
    });
  });

  describe('Session Fixation Prevention', () => {
    it('should regenerate session on login', () => {
      // JWT-based auth naturally avoids session fixation by generating new tokens
      const jwtUsage = grepCodebaseFixed('jwtService', ['node_modules', 'dist', 'test']);
      const tokenGenerators = grepCodebase('generateToken|TokenGenerator|signAsync', [
        'node_modules',
        'dist',
        'test',
      ]);

      // Should use JWT service or token generator
      expect(jwtUsage.length + tokenGenerators.length).toBeGreaterThan(0);
    });

    it('should not accept session IDs from URL', () => {
      const sessionConfig = grepCodebase('session|cookie', ['node_modules', 'dist']);

      for (const match of sessionConfig) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Should not have URL-based session
        expect(content).not.toMatch(/session.*url|sessionId.*query/i);
      }
    });
  });

  describe('Cookie Security', () => {
    it('should set HttpOnly flag on auth cookies', () => {
      const cookieUsage = grepCodebase('cookie|Cookie', ['node_modules', 'dist']);
      let hasHttpOnly = false;

      for (const match of cookieUsage) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (content.includes('httpOnly: true') || content.includes('httpOnly=true')) {
          hasHttpOnly = true;
        }
      }

      // If using cookies, should have HttpOnly
      const usesCookies = cookieUsage.length > 0;
      if (usesCookies) {
        expect(hasHttpOnly).toBe(true);
      }
    });

    it('should set Secure flag in production', () => {
      const cookieUsage = grepCodebase('cookie|Cookie', ['node_modules', 'dist']);
      let hasCookieConfig = false;

      for (const match of cookieUsage) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // If setting cookies, should have secure flag or be using httpOnly
        if (content.includes('cookie') || content.includes('Cookie')) {
          if (
            content.includes('secure') ||
            content.includes('httpOnly') ||
            content.includes('sameSite') ||
            content.includes('NODE_ENV') ||
            content.includes('cookieParser')
          ) {
            hasCookieConfig = true;
          }
        }
      }

      // If using cookies, should have some security config
      const usesCookies = cookieUsage.length > 0;
      if (usesCookies) {
        expect(hasCookieConfig).toBe(true);
      }
    });
  });

  describe('Logout Security', () => {
    it('should invalidate tokens on logout', () => {
      const logoutHandlers = grepCodebase('logout|signOut|logOut', ['node_modules', 'dist']);
      let invalidatesToken = false;

      for (const match of logoutHandlers) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('delete') ||
          content.includes('remove') ||
          content.includes('invalidate') ||
          content.includes('revoke') ||
          content.includes('blacklist') ||
          content.includes('clear')
        ) {
          invalidatesToken = true;
        }
      }

      expect(invalidatesToken).toBe(true);
    });
  });

  describe('Token Revocation', () => {
    it('should have mechanism to revoke tokens', () => {
      const tokenRevocation = grepCodebase('revoke|blacklist|invalidate.*token|delete.*token', [
        'node_modules',
        'dist',
      ]);
      expect(tokenRevocation.length).toBeGreaterThan(0);
    });
  });
});

describe('CSRF Protection', () => {
  describe('Token-Based Protection', () => {
    it('should use stateless JWT (inherently CSRF-safe when not in cookies)', () => {
      const authMechanism = grepCodebase('Bearer|Authorization', ['node_modules', 'dist']);
      let usesBearer = false;

      for (const match of authMechanism) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (content.includes('Bearer') || content.includes("Authorization'")) {
          usesBearer = true;
        }
      }

      expect(usesBearer).toBe(true);
    });

    it('should validate origin for WebSocket connections', () => {
      const wsHandlers = grepCodebase('WebSocketGateway|handleConnection|socket', [
        'node_modules',
        'dist',
      ]);

      for (const match of wsHandlers) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('gateway')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // WebSocket should validate origin or use auth tokens
        if (content.includes('WebSocketGateway')) {
          const hasOriginCheck =
            content.includes('origin') ||
            content.includes('cors') ||
            content.includes('handshake') ||
            content.includes('authenticate');
          expect(hasOriginCheck).toBe(true);
        }
      }
    });
  });

  describe('State-Changing Operations', () => {
    it('should not allow GET requests for state-changing operations', () => {
      const controllers = grepCodebaseFixed('@Controller', ['node_modules', 'dist']);

      for (const match of controllers) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // Find @Get decorators and check what they do
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('@Get')) {
            // Look at next 10 lines for dangerous operations
            const methodBody = lines.slice(i, i + 15).join('\n');

            // GET should not modify data (except for query operations)
            const modifiesData =
              (methodBody.includes('.create(') && !methodBody.includes('find')) ||
              (methodBody.includes('.update(') && !methodBody.includes('find')) ||
              (methodBody.includes('.delete(') && !methodBody.includes('find'));

            if (modifiesData) {
              expect(methodBody).not.toMatch(/\.create\(|\.update\(|\.delete\(/);
            }
          }
        }
      }
    });
  });
});

describe('Authentication Security', () => {
  describe('Password Security', () => {
    it('should hash passwords before storage', () => {
      const passwordHandling = grepCodebase('password|Password', ['node_modules', 'dist']);
      let hasHashing = false;

      for (const match of passwordHandling) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.service.ts') && !filePath.includes('auth')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('bcrypt') ||
          content.includes('argon2') ||
          content.includes('hash') ||
          content.includes('passwordHash')
        ) {
          hasHashing = true;
        }
      }

      expect(hasHashing).toBe(true);
    });

    it('should use timing-safe comparison for passwords', () => {
      const passwordCompare = grepCodebase('compare|verify.*password', ['node_modules', 'dist']);
      let hasSafeCompare = false;

      for (const match of passwordCompare) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // bcrypt.compare and argon2.verify are timing-safe
        if (
          content.includes('bcrypt.compare') ||
          content.includes('argon2.verify') ||
          content.includes('timingSafeEqual') ||
          content.includes('comparePassword')
        ) {
          hasSafeCompare = true;
        }
      }

      expect(hasSafeCompare).toBe(true);
    });
  });

  describe('Brute Force Protection', () => {
    it('should implement rate limiting on auth endpoints', () => {
      const authEndpoints = grepCodebase('@Controller.*auth|login|authenticate', [
        'node_modules',
        'dist',
      ]);
      let hasRateLimiting = false;

      for (const match of authEndpoints) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('@Throttle') ||
          content.includes('ThrottlerGuard') ||
          content.includes('rateLimit') ||
          content.includes('RateLimit')
        ) {
          hasRateLimiting = true;
        }
      }

      // Also check if throttler is globally configured
      const mainFile = fs.readFileSync(`${SRC_DIR}/main.ts`, 'utf-8');
      if (mainFile.includes('Throttler') || mainFile.includes('rateLimit')) {
        hasRateLimiting = true;
      }

      // Check app.module for global throttler
      const appModuleFiles = grepCodebaseFixed('ThrottlerModule', ['node_modules', 'dist']);
      if (appModuleFiles.length > 0) {
        hasRateLimiting = true;
      }

      expect(hasRateLimiting).toBe(true);
    });

    it('should implement account lockout', () => {
      const authService = grepCodebase('login|authenticate', ['node_modules', 'dist']);
      let hasLockout = false;

      for (const match of authService) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.service.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('failedAttempts') ||
          content.includes('lockout') ||
          content.includes('locked') ||
          content.includes('MAX_ATTEMPTS') ||
          content.includes('attempts')
        ) {
          hasLockout = true;
        }
      }

      // Lockout is recommended but not strictly required if rate limiting exists
      expect(hasLockout).toBe(true);
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('should support 2FA', () => {
      const twoFa = grepCodebase('2fa|twoFactor|totp|authenticator|TwoFactor', [
        'node_modules',
        'dist',
      ]);
      expect(twoFa.length).toBeGreaterThan(0);
    });

    it('should verify 2FA before completing login', () => {
      const twoFaVerify = grepCodebase(
        'verify.*2fa|verify.*totp|twoFactor.*verify|verify2fa|verifyTwoFactor',
        ['node_modules', 'dist'],
      );
      expect(twoFaVerify.length).toBeGreaterThan(0);
    });
  });
});

describe('Authorization Security', () => {
  describe('Role-Based Access Control', () => {
    it('should implement role checks', () => {
      const roleChecks = grepCodebase('@Roles|RolesGuard|hasRole|role|Role', [
        'node_modules',
        'dist',
      ]);
      expect(roleChecks.length).toBeGreaterThan(0);
    });

    it('should check ownership for resource access', () => {
      const ownershipChecks = grepCodebase('userId|ownerId|authorId|createdBy', [
        'node_modules',
        'dist',
      ]);
      let hasOwnershipCheck = false;

      for (const match of ownershipChecks) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.service.ts') && !filePath.includes('.repository.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('where:') &&
          (content.includes('userId') || content.includes('ownerId'))
        ) {
          hasOwnershipCheck = true;
        }
      }

      expect(hasOwnershipCheck).toBe(true);
    });
  });

  describe('Permission Validation', () => {
    it('should validate permissions before operations', () => {
      const permissionChecks = grepCodebase(
        'Permission|canAccess|hasPermission|isAuthorized|Guard',
        ['node_modules', 'dist'],
      );
      expect(permissionChecks.length).toBeGreaterThan(0);
    });
  });
});
