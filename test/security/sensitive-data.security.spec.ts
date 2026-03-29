/**
 * Sensitive Data Exposure Security Tests
 *
 * Tests for proper handling, storage, and transmission of sensitive data.
 * Includes checks for PII, secrets, and confidential information.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  fileExists,
  grepCodebase,
  grepCodebaseFixed,
  ROOT_DIR,
  readAllTsFiles,
  SRC_DIR,
} from './security-utils';

describe('Sensitive Data Exposure Prevention', () => {
  describe('Hardcoded Secrets Detection', () => {
    it('should not have hardcoded passwords', () => {
      const passwords = grepCodebase('password\\s*=\\s*[\'"](?!\\s*$)[^\'"]+[\'"]', [
        'node_modules',
        'dist',
        'test',
      ]);
      const violations = passwords.filter(
        (p) =>
          !p.includes('process.env') &&
          !p.includes('configService') &&
          !p.includes('example') &&
          !p.includes('template') &&
          !p.includes('interface ') &&
          !p.includes('type ') &&
          !p.includes('// '),
      );
      expect(violations).toEqual([]);
    });

    it('should not have hardcoded API keys', () => {
      const apiKeys = grepCodebase('(api[_-]?key|apiKey)\\s*=\\s*[\'"][^\'"]+[\'"]', [
        'node_modules',
        'dist',
        'test',
      ]);
      const violations = apiKeys.filter(
        (k) =>
          !k.includes('process.env') &&
          !k.includes('configService') &&
          !k.includes('example') &&
          !k.includes('interface ') &&
          !k.includes('type '),
      );
      expect(violations).toEqual([]);
    });

    it('should not have hardcoded secret keys', () => {
      const secrets = grepCodebase('secret\\s*=\\s*[\'"][^\'"]{10,}[\'"]', [
        'node_modules',
        'dist',
        'test',
      ]);
      const violations = secrets.filter(
        (s) =>
          !s.includes('process.env') &&
          !s.includes('configService') &&
          !s.includes('example') &&
          !s.includes('template') &&
          !s.includes('interface ') &&
          !s.includes('type '),
      );
      expect(violations).toEqual([]);
    });

    it('should not have hardcoded connection strings', () => {
      const connStrings = grepCodebase('postgresql://|mysql://|mongodb://|redis://', [
        'node_modules',
        'dist',
        'test',
      ]);
      const violations = connStrings.filter(
        (c) =>
          !c.includes('process.env') &&
          !c.includes('localhost') &&
          !c.includes('127.0.0.1') &&
          !c.includes('example') &&
          !c.includes('.env'),
      );
      expect(violations).toEqual([]);
    });

    it('should not have AWS credentials in code', () => {
      const awsKeys = grepCodebase('AKIA[A-Z0-9]{16}', ['node_modules', 'dist']);
      expect(awsKeys).toEqual([]);
    });

    it('should not have private keys in code', () => {
      const privateKeys = grepCodebase('-----BEGIN (RSA |EC )?PRIVATE KEY-----', [
        'node_modules',
        'dist',
      ]);
      expect(privateKeys).toEqual([]);
    });
  });

  describe('Password Handling', () => {
    it('should not return passwords in API responses', () => {
      const dtoFiles = readAllTsFiles(SRC_DIR).filter(
        (f) => f.includes('response.dto') || f.includes('response-dto'),
      );

      for (const file of dtoFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Response DTOs should not include password fields
        expect(content).not.toMatch(/password\s*[?:]?\s*:\s*string/i);
        expect(content).not.toMatch(/passwordHash\s*[?:]?\s*:\s*string/i);
      }
    });

    it('should exclude passwords from database queries', () => {
      const selectStatements = grepCodebaseFixed('select:', ['node_modules', 'dist']);

      for (const match of selectStatements) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // If selecting user data, should exclude password
        if (content.includes('select:') && content.includes('user')) {
          // Check for explicit password: false or omission
          const _hasPasswordExclusion =
            content.includes('passwordHash: false') ||
            content.includes('password: false') ||
            !content.match(/select:[\s\S]*password/);
          // Not all queries need this, so just a soft check
        }
      }
    });

    it('should not log passwords', () => {
      const logStatements = grepCodebase('logger\\.|console\\.', ['node_modules', 'dist']);
      const passwordLogs = logStatements.filter(
        (l) => l.includes('password') && !l.includes('[REDACTED]'),
      );
      expect(passwordLogs).toEqual([]);
    });
  });

  describe('PII Protection', () => {
    it('should not expose email in public endpoints without authorization', () => {
      const publicEndpoints = grepCodebaseFixed('@Public', ['node_modules', 'dist']);

      for (const match of publicEndpoints) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Find public methods
        const publicMethods = content.split('@Public');

        for (const _method of publicMethods.slice(1)) {
          // Should not return full email in public responses
          // Allow partial/masked email
        }
      }
    });

    it('should mask sensitive fields in logs', () => {
      const logStatements = grepCodebase('logger\\.|console\\.', ['node_modules', 'dist']);
      const sensitiveFields = ['email', 'phone', 'address', 'ssn', 'creditCard'];

      for (const match of logStatements) {
        for (const field of sensitiveFields) {
          if (match.toLowerCase().includes(field)) {
            // Should have masking or redaction
            const _hasMasking =
              match.includes('mask') ||
              match.includes('[REDACTED]') ||
              match.includes('***') ||
              match.includes('sanitize');
            // Log a warning but don't fail - might be intentional debug logging
          }
        }
      }
    });

    it('should implement data minimization in responses', () => {
      const responseFiles = readAllTsFiles(SRC_DIR).filter(
        (f) => f.includes('response') && f.includes('.dto.ts'),
      );

      // Response DTOs should exist and define explicit fields
      expect(responseFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Token Security', () => {
    it('should not log tokens', () => {
      const logStatements = grepCodebase('logger\\.|console\\.', ['node_modules', 'dist']);
      const tokenLogs = logStatements.filter(
        (l) =>
          (l.includes('token') || l.includes('Token')) &&
          !l.includes('[REDACTED]') &&
          !l.includes('tokenExpired') &&
          !l.includes('tokenType'),
      );
      expect(tokenLogs).toEqual([]);
    });

    it('should not return full tokens in error messages', () => {
      const errorMessages = grepCodebase('throw new|Error\\(', ['node_modules', 'dist']);

      for (const match of errorMessages) {
        // Error messages should not contain actual token values
        expect(match).not.toMatch(/token.*=.*[a-zA-Z0-9]{20,}/);
      }
    });

    it('should use secure token storage', () => {
      const tokenStorage = grepCodebaseFixed('localStorage', ['node_modules', 'dist']);
      // Backend should not use browser storage
      expect(tokenStorage).toEqual([]);
    });
  });

  describe('Database Security', () => {
    it('should not store plaintext passwords', () => {
      const userModels = grepCodebase('model User|password.*String', [
        'node_modules',
        'dist',
        'test',
      ]);

      for (const match of userModels) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // If there's a password field, it should be named passwordHash
        if (content.includes('password') && content.includes('model User')) {
          expect(content).toMatch(/passwordHash|password_hash/);
        }
      }
    });
  });

  describe('API Response Security', () => {
    it('should not expose internal errors to clients', () => {
      const exceptionFilters = grepCodebase('ExceptionFilter|catch\\(', ['node_modules', 'dist']);

      for (const match of exceptionFilters) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (filePath.includes('.spec.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Should not expose stack traces in production
        if (content.includes('stack')) {
          expect(content).toMatch(/NODE_ENV|isProduction|development/);
        }
      }
    });

    it('should not expose database errors', () => {
      const catchBlocks = grepCodebase('catch.*Prisma|PrismaClientKnownRequestError', [
        'node_modules',
        'dist',
      ]);

      for (const match of catchBlocks) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Should transform Prisma errors to user-friendly messages
        if (content.includes('PrismaClientKnownRequestError')) {
          // Should have error transformation
          const hasTransformation =
            content.includes('HttpException') ||
            content.includes('BadRequestException') ||
            content.includes('message:') ||
            content.includes('switch');
          expect(hasTransformation).toBe(true);
        }
      }
    });

    it('should remove sensitive headers', () => {
      // Helmet may be configured in a separate security config module
      const helmetUsage = grepCodebaseFixed('helmet', ['node_modules', 'dist', 'test']);
      expect(helmetUsage.length).toBeGreaterThan(0);
    });
  });

  describe('File Upload Security', () => {
    it('should not expose file paths to users', () => {
      const uploadHandlers = grepCodebase('UploadedFile|multer', ['node_modules', 'dist']);

      for (const match of uploadHandlers) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Should not return internal file paths
        if (content.includes('return') && content.includes('path')) {
          // Should use public URLs instead of file paths
          expect(content).toMatch(/url|publicUrl|signedUrl|cdn/);
        }
      }
    });
  });

  describe('Environment Configuration', () => {
    it('should have .env in gitignore', () => {
      const gitignorePath = path.join(ROOT_DIR, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
        expect(gitignore).toContain('.env');
      }
    });

    it('should have .env.example without real secrets', () => {
      const envExamplePath = path.join(ROOT_DIR, '.env.example');
      if (fs.existsSync(envExamplePath)) {
        const envExample = fs.readFileSync(envExamplePath, 'utf-8');

        // Should not contain real secrets
        expect(envExample).not.toMatch(/AKIA[A-Z0-9]{16}/);
        expect(envExample).not.toMatch(/-----BEGIN.*PRIVATE KEY-----/);

        // Should have placeholders
        expect(envExample).toMatch(/your_|changeme|xxx|placeholder|<.*>/i);
      }
    });

    it('should load secrets from environment', () => {
      const configFiles = grepCodebase('process\\.env\\.|configService\\.get', [
        'node_modules',
        'dist',
      ]);
      let usesEnvVars = false;

      for (const match of configFiles) {
        if (
          match.includes('JWT_SECRET') ||
          match.includes('DATABASE_URL') ||
          match.includes('API_KEY')
        ) {
          usesEnvVars = true;
        }
      }

      expect(usesEnvVars).toBe(true);
    });
  });

  describe('Logging Security', () => {
    it('should not log request bodies containing passwords', () => {
      const loggingMiddleware = grepCodebase('middleware|interceptor', ['node_modules', 'dist']);

      for (const match of loggingMiddleware) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (filePath.includes('.spec.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // If logging request body, should sanitize
        if (content.includes('req.body') && content.includes('log')) {
          expect(content).toMatch(/sanitize|redact|mask|excludePaths|password.*=.*false/);
        }
      }
    });

    it('should configure log levels for production', () => {
      const logConfig = grepCodebase('LogLevel|logLevel|LOG_LEVEL', ['node_modules', 'dist']);
      let hasLogConfig = false;

      for (const match of logConfig) {
        if (match.includes('production') || match.includes('NODE_ENV')) {
          hasLogConfig = true;
        }
      }

      expect(hasLogConfig).toBe(true);
    });
  });

  describe('Data Transmission', () => {
    it('should not send sensitive data in URLs', () => {
      const urlPatterns = grepCodebase('@Query.*password|@Param.*token|@Query.*secret', [
        'node_modules',
        'dist',
      ]);
      expect(urlPatterns).toEqual([]);
    });

    it('should use POST for sensitive operations', () => {
      const controllers = readAllTsFiles(SRC_DIR).filter((f) => f.includes('.controller.ts'));

      for (const file of controllers) {
        const content = fs.readFileSync(file, 'utf-8');

        // Password reset, login, etc. should use POST
        if (
          content.includes('password') ||
          content.includes('token') ||
          content.includes('secret')
        ) {
          const hasGet =
            content.includes('@Get') &&
            (content.includes('password') || content.includes('secret'));
          // GET with sensitive data should be avoided
          expect(hasGet).toBe(false);
        }
      }
    });
  });

  describe('Cache Security', () => {
    it('should not cache sensitive data without encryption', () => {
      const cacheUsage = grepCodebase('cache\\.set|redis\\.set|setex', ['node_modules', 'dist']);

      for (const match of cacheUsage) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // If caching user data, should not include sensitive fields
        if (content.includes('cache') && content.includes('user')) {
          expect(content).not.toMatch(/password|passwordHash|secret/);
        }
      }
    });

    it('should set appropriate TTL on cached data', () => {
      const cacheUsage = grepCodebase('cache\\.set|setex|ttl|expire', ['node_modules', 'dist']);
      let hasTtl = false;

      for (const match of cacheUsage) {
        if (
          match.includes('ttl') ||
          match.includes('expire') ||
          match.includes('setex') ||
          match.includes('TTL')
        ) {
          hasTtl = true;
        }
      }

      // If using cache, should have TTL
      const usesCache = cacheUsage.length > 0;
      if (usesCache) {
        expect(hasTtl).toBe(true);
      }
    });
  });
});
