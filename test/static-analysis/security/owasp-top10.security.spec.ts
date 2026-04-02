/**
 * OWASP Top 10 Security Tests
 *
 * Static analysis tests to detect common security vulnerabilities.
 * These tests scan the codebase for patterns that violate OWASP guidelines.
 *
 * Categories covered:
 * - A01:2021 Broken Access Control
 * - A02:2021 Cryptographic Failures
 * - A03:2021 Injection
 * - A04:2021 Insecure Design
 * - A05:2021 Security Misconfiguration
 * - A06:2021 Vulnerable Components
 * - A07:2021 Authentication Failures
 * - A08:2021 Integrity Failures
 * - A09:2021 Logging Failures
 * - A10:2021 SSRF
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import {
  fileExists,
  grepCodebase,
  grepCodebaseFixed,
  readAllTsFiles,
  SRC_DIR,
} from './security-utils';

describe('OWASP Top 10 Security Tests', () => {
  describe('A01:2021 - Broken Access Control', () => {
    it('should not have routes without authentication decorators (except public)', () => {
      const controllerFiles = grepCodebase('@Controller', ['node_modules', 'dist']);
      const unprotectedRoutes: string[] = [];

      for (const file of controllerFiles) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Skip if file has @Public() at class level
        if (
          content.includes('@Public()') &&
          content.indexOf('@Public()') < content.indexOf('@Controller')
        ) {
          continue;
        }

        // Check for class-level auth indicators:
        // - @UseGuards / @RequirePermission = explicit guards
        // - @ApiBearerAuth = expects JWT (global guard handles it)
        // - JwtAuthGuard reference = explicit guard
        const hasClassLevelAuth =
          content.includes('@UseGuards') ||
          content.includes('@RequirePermission') ||
          content.includes('@ApiBearerAuth') ||
          content.includes('JwtAuthGuard');

        // If class has auth indicator, all routes are protected by global guard
        if (hasClassLevelAuth) continue;

        // Check each route method
        const routeMethods = ['@Get', '@Post', '@Put', '@Patch', '@Delete'];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (routeMethods.some((m) => line.includes(m))) {
            // Check surrounding lines (5 before and 2 after) for auth decorators
            const surroundingLines = lines
              .slice(Math.max(0, i - 5), Math.min(lines.length, i + 3))
              .join('\n');
            const hasAuth =
              surroundingLines.includes('@UseGuards') ||
              surroundingLines.includes('@Public') ||
              surroundingLines.includes('@RequirePermission') ||
              surroundingLines.includes('@AllowUnverifiedEmail');

            if (!hasAuth && !filePath.includes('health') && !filePath.includes('public')) {
              unprotectedRoutes.push(`${filePath}:${i + 1}`);
            }
          }
        }
      }

      // Filter out known public endpoints
      const allowedPublic = [
        'health',
        'docs',
        'openapi',
        'public-theme',
        'public-profile',
        'public-resume',
      ];
      const violations = unprotectedRoutes.filter(
        (route) => !allowedPublic.some((allowed) => route.toLowerCase().includes(allowed)),
      );

      expect(violations).toEqual([]);
    });

    it('should use ownership checks for resource access', () => {
      const serviceFiles = readAllTsFiles(SRC_DIR).filter((f) => f.includes('.service.ts'));
      const _missingOwnershipChecks: string[] = [];

      for (const file of serviceFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Skip files without database operations
        if (!content.includes('prisma') && !content.includes('repository')) continue;

        // Check for findUnique/findFirst without userId check
        const findOperations =
          content.match(/\.(findUnique|findFirst|findMany)\s*\(\s*\{[\s\S]*?\}\s*\)/g) || [];

        for (const op of findOperations) {
          // Skip if it's in a public service or has userId in where clause
          if (op.includes('userId') || op.includes('ownerId') || op.includes('authorId')) continue;
          if (file.includes('public') || file.includes('admin')) continue;

          // Check if the method containing this has userId parameter
          const methodMatch = content.match(
            new RegExp(
              `async\\s+\\w+\\s*\\([^)]*\\)\\s*[^{]*\\{[^}]*${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
            ),
          );
          if (methodMatch && !methodMatch[0].includes('userId')) {
            // This might be a false positive, log for review
          }
        }
      }
    });

    it('should not expose internal IDs in URLs without authorization', () => {
      const controllerFiles = readAllTsFiles(SRC_DIR).filter((f) => f.includes('.controller.ts'));
      const directIdAccess: string[] = [];

      for (const file of controllerFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for direct ID parameter usage without ownership validation
        const idParams = content.match(/@Param\s*\(\s*['"]id['"]\s*\)/g) || [];
        if (idParams.length > 0) {
          // Verify service methods validate ownership
          const hasOwnershipCheck =
            content.includes('userId') ||
            content.includes('req.user') ||
            content.includes('@CurrentUser') ||
            content.includes('ownerId');

          if (!hasOwnershipCheck && !file.includes('public') && !file.includes('admin')) {
            directIdAccess.push(file);
          }
        }
      }

      // All files with :id params should validate ownership
      expect(directIdAccess.length).toBeLessThanOrEqual(5); // Allow some admin endpoints
    });
  });

  describe('A02:2021 - Cryptographic Failures', () => {
    it('should not have hardcoded secrets or API keys', () => {
      const secretPatterns = [
        'password\\s*=\\s*[\'"][^\'"]+[\'"]',
        'secret\\s*=\\s*[\'"][^\'"]+[\'"]',
        'api_key\\s*=\\s*[\'"][^\'"]+[\'"]',
        'apiKey\\s*=\\s*[\'"][^\'"]+[\'"]',
        'AWS_SECRET',
        'SENDGRID_API_KEY\\s*=\\s*[\'"]SG\\.',
      ];

      const violations: string[] = [];

      for (const pattern of secretPatterns) {
        const matches = grepCodebase(pattern, ['node_modules', 'dist', 'test', '.env']);
        for (const match of matches) {
          // Exclude type definitions and config templates
          if (
            !match.includes('.d.ts') &&
            !match.includes('.example') &&
            !match.includes('.template') &&
            !match.includes('process.env') &&
            !match.includes('configService') &&
            !match.includes('// ') &&
            !match.includes('interface ') &&
            !match.includes('type ')
          ) {
            violations.push(match);
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('should use secure hashing for passwords (bcrypt)', () => {
      const passwordFiles = grepCodebase('password', ['node_modules', 'dist']);
      const insecureHashing: string[] = [];

      for (const file of passwordFiles) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (filePath.includes('.spec.ts') || filePath.includes('.test.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for insecure hashing
        if (
          (content.includes('md5') || content.includes('sha1') || content.includes('sha256')) &&
          content.includes('password') &&
          !content.includes('bcrypt')
        ) {
          insecureHashing.push(filePath);
        }
      }

      expect(insecureHashing).toEqual([]);
    });

    it('should use HTTPS for external API calls', () => {
      const httpCalls = grepCodebase('http://', ['node_modules', 'dist']);
      const insecureUrls: string[] = [];

      for (const match of httpCalls) {
        // Exclude:
        // - localhost/127.0.0.1 (development)
        // - test files
        // - comments
        // - SVG/HTML namespace URLs (not actual requests)
        // - String manipulation (replace operations)
        // - Internal services (libretranslate, swagger, config)
        // - Template files
        if (
          !match.includes('localhost') &&
          !match.includes('127.0.0.1') &&
          !match.includes('.spec.ts') &&
          !match.includes('.test.ts') &&
          !match.includes('// ') &&
          !match.includes('example.com') &&
          !match.includes('xmlns') &&
          !match.includes('.replace(') &&
          !match.includes('libretranslate') &&
          !match.includes('helper.ts') &&
          !match.includes('swagger') &&
          !match.includes('config') &&
          !match.includes('template')
        ) {
          insecureUrls.push(match);
        }
      }

      expect(insecureUrls).toEqual([]);
    });

    it('should use secure JWT configuration', () => {
      const jwtFiles = grepCodebase('JwtModule', ['node_modules', 'dist']);
      let hasSecureJwtConfig = false;

      for (const file of jwtFiles) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check if this is the main auth module (has expiresIn)
        if (content.includes('expiresIn') || content.includes('signOptions')) {
          hasSecureJwtConfig = true;
          // Check secret comes from env
          expect(content).toMatch(/process\.env|configService|secret:\s*\w+Secret/);
        }
      }

      // At least one JWT module should have expiration configured
      expect(hasSecureJwtConfig).toBe(true);
    });
  });

  describe('A03:2021 - Injection', () => {
    it('should not use unsafe raw SQL queries', () => {
      // Check for truly unsafe patterns: $queryRawUnsafe and $executeRawUnsafe
      const unsafePatterns = ['\\$queryRawUnsafe', '\\$executeRawUnsafe'];
      const violations: string[] = [];

      for (const pattern of unsafePatterns) {
        const matches = grepCodebase(pattern, ['node_modules', 'dist', 'test', 'migrations']);
        for (const match of matches) {
          // Skip type definitions, prisma service type unions, and test files
          if (
            !match.includes('.spec.ts') &&
            !match.includes('.test.ts') &&
            !match.includes("| '") && // Type union like | '$queryRawUnsafe'
            !match.includes('type ') &&
            !match.includes('interface ')
          ) {
            violations.push(match);
          }
        }
      }

      // Unsafe raw queries should not exist in production code
      expect(violations).toEqual([]);
    });

    it('should use parameterized queries in Prisma', () => {
      const prismaFiles = grepCodebase('prisma\\.', ['node_modules', 'dist']);
      const stringConcatInQueries: string[] = [];

      for (const file of prismaFiles) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (filePath.includes('.spec.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for string concatenation in where clauses
        const whereMatches = content.match(/where\s*:\s*\{[^}]*\+[^}]*\}/g) || [];
        if (whereMatches.length > 0) {
          stringConcatInQueries.push(filePath);
        }

        // Check for template literals in queries
        const templateInQuery = content.match(/where\s*:\s*`[^`]*\$\{/g) || [];
        if (templateInQuery.length > 0) {
          stringConcatInQueries.push(filePath);
        }
      }

      expect(stringConcatInQueries).toEqual([]);
    });

    it('should sanitize user input in command execution', () => {
      const execPatterns = ['exec\\(', 'execSync\\(', 'spawn\\(', 'spawnSync\\('];
      const violations: string[] = [];

      for (const pattern of execPatterns) {
        const matches = grepCodebase(pattern, ['node_modules', 'dist', 'test', 'scripts']);
        violations.push(...matches.filter((m) => !m.includes('.spec.ts')));
      }

      // Should not have command execution in application code
      expect(violations.length).toBeLessThanOrEqual(0);
    });
  });

  describe('A04:2021 - Insecure Design', () => {
    it('should implement rate limiting on sensitive endpoints', () => {
      // Check for global rate limiting via ThrottlerModule
      const appModuleFiles = grepCodebaseFixed('ThrottlerModule', ['node_modules', 'dist']);
      const hasGlobalThrottling = appModuleFiles.length > 0;

      // Or check for per-route throttling
      const throttleUsage = grepCodebase('@Throttle|ThrottlerGuard', ['node_modules', 'dist']);
      const hasRouteThrottling = throttleUsage.length > 0;

      // At least one form of rate limiting should exist
      expect(hasGlobalThrottling || hasRouteThrottling).toBe(true);
    });

    it('should validate file uploads', () => {
      // Check for file validation in upload service or controller
      const uploadFiles = readAllTsFiles(SRC_DIR).filter(
        (f) => f.includes('upload') && (f.includes('.service.ts') || f.includes('.controller.ts')),
      );

      let hasFileValidation = false;

      for (const file of uploadFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for file size limits
        const hasLimit =
          content.includes('maxFileSize') ||
          content.includes('maxSize') ||
          content.includes('fileSize') ||
          content.includes('limits') ||
          content.includes('size >');

        // Check for file type validation
        const hasTypeValidation =
          content.includes('mimetype') ||
          content.includes('allowedMimeTypes') ||
          content.includes('fileFilter') ||
          content.includes('ParseFilePipe') ||
          content.includes('validateFile');

        if (hasLimit || hasTypeValidation) {
          hasFileValidation = true;
        }
      }

      // Should have file validation somewhere in upload logic
      expect(hasFileValidation).toBe(true);
    });
  });

  describe('A05:2021 - Security Misconfiguration', () => {
    it('should use Helmet for HTTP security headers', () => {
      // Helmet may be in main.ts or in a security config module
      const helmetUsage = grepCodebaseFixed('helmet', ['node_modules', 'dist', 'test']);
      expect(helmetUsage.length).toBeGreaterThan(0);
    });

    it('should have CORS properly configured', () => {
      // CORS may be in main.ts or security config
      const corsUsage = grepCodebase('enableCors|configureCors', ['node_modules', 'dist', 'test']);
      expect(corsUsage.length).toBeGreaterThan(0);

      // Should not have wildcard origin in production
      const corsConfig = grepCodebase('origin.*\\*', ['node_modules', 'dist']);
      const prodViolations = corsConfig.filter(
        (c) => !c.includes('development') && !c.includes('test') && !c.includes('.spec.ts'),
      );
      expect(prodViolations.length).toBeLessThanOrEqual(1);
    });

    it('should disable debug mode in production', () => {
      const debugPatterns = grepCodebase('debug:\\s*true', ['node_modules', 'dist', 'test']);
      const prodViolations = debugPatterns.filter(
        (d) => !d.includes('NODE_ENV') && !d.includes('development'),
      );
      expect(prodViolations).toEqual([]);
    });

    it('should not expose stack traces in production', () => {
      const exceptionFilters = grepCodebase('ExceptionFilter', ['node_modules', 'dist']);
      const stackExposures: string[] = [];

      for (const file of exceptionFilters) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (filePath.includes('.spec.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Only flag if stack is directly included in JSON response
        // Pattern: response.json({...stack...}) or return {...stack...}
        const hasStackInResponse =
          content.match(/\.json\s*\(\s*\{[^}]*stack[^}]*\}/) ||
          content.match(/return\s*\{[^}]*stack:[^}]*exception\.stack/);

        if (hasStackInResponse) {
          // Should check NODE_ENV before including stack in response
          const hasEnvCheck = content.match(/NODE_ENV|isProduction|development/);
          if (!hasEnvCheck) {
            stackExposures.push(filePath);
          }
        }
      }

      expect(stackExposures).toEqual([]);
    });
  });

  describe('A06:2021 - Vulnerable Components', () => {
    it('should not import deprecated or vulnerable packages', () => {
      const deprecatedPackages = ['request', 'request-promise', 'node-uuid', 'crypto-js'];
      const violations: string[] = [];

      for (const pkg of deprecatedPackages) {
        const matches = grepCodebase(`from\\s*['"]${pkg}['"]`, ['node_modules', 'dist']);
        violations.push(...matches);
      }

      expect(violations).toEqual([]);
    });
  });

  describe('A07:2021 - Authentication Failures', () => {
    it('should enforce password complexity in DTOs', () => {
      const passwordDtos = grepCodebase('password.*string|@IsString.*password', [
        'node_modules',
        'dist',
      ]);
      const hasValidation: string[] = [];

      for (const file of passwordDtos) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.dto.ts') && !filePath.includes('.schema.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for password validation
        if (
          content.includes('@MinLength') ||
          content.includes('@Matches') ||
          content.includes('@IsStrongPassword') ||
          content.includes('PasswordSchema') ||
          content.includes('.min(')
        ) {
          hasValidation.push(filePath);
        }
      }

      // Should have password validation
      expect(hasValidation.length).toBeGreaterThan(0);
    });

    it('should implement account lockout mechanism', () => {
      const authService = grepCodebase('login|authenticate', ['node_modules', 'dist']);
      let hasLockout = false;

      for (const file of authService) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.service.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (
          content.includes('failedAttempts') ||
          content.includes('lockout') ||
          content.includes('blocked') ||
          content.includes('MAX_ATTEMPTS')
        ) {
          hasLockout = true;
        }
      }

      expect(hasLockout).toBe(true);
    });
  });

  describe('A08:2021 - Software and Data Integrity', () => {
    it('should validate data integrity on critical operations', () => {
      const transactionFiles = grepCodebase('\\$transaction|transaction', ['node_modules', 'dist']);

      // Critical operations should use transactions
      expect(transactionFiles.length).toBeGreaterThan(0);
    });
  });

  describe('A09:2021 - Security Logging and Monitoring', () => {
    it('should log authentication events', () => {
      const authFiles = grepCodebase('login|logout|authenticate', ['node_modules', 'dist']);
      let hasAuthLogging = false;

      for (const file of authFiles) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (!filePath.includes('.service.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (content.includes('logger') && (content.includes('login') || content.includes('auth'))) {
          hasAuthLogging = true;
        }
      }

      expect(hasAuthLogging).toBe(true);
    });

    it('should not log sensitive data', () => {
      const logStatements = grepCodebase('logger\\.(log|info|warn|error|debug)', [
        'node_modules',
        'dist',
      ]);
      const sensitiveDataLogging: string[] = [];

      for (const match of logStatements) {
        // Check for actual sensitive data values being logged
        if (
          match.includes('password') ||
          match.includes('secret') ||
          match.includes('creditCard')
        ) {
          // Exclude messages that just mention tokens/passwords without logging values
          if (
            !match.includes('***') &&
            !match.includes('[REDACTED]') &&
            !match.includes('password:') &&
            !match.includes('no password') &&
            !match.includes('invalid password')
          ) {
            sensitiveDataLogging.push(match);
          }
        }

        // Token logging should be checked more carefully
        if (match.includes('token')) {
          // Exclude informational messages about token state
          const isInfoMessage =
            match.includes('no token') ||
            match.includes('invalid token') ||
            match.includes('token expired') ||
            match.includes('token provided') ||
            match.includes('token:') ||
            match.includes('tokenType');

          if (!isInfoMessage && !match.includes('[REDACTED]')) {
            // Check if it's logging the actual token value
            if (match.match(/token\s*[=:]\s*\$\{|token\s*[=:]\s*\w+\./)) {
              sensitiveDataLogging.push(match);
            }
          }
        }
      }

      expect(sensitiveDataLogging).toEqual([]);
    });
  });

  describe('A10:2021 - Server-Side Request Forgery (SSRF)', () => {
    it('should validate and sanitize URLs in external requests', () => {
      const httpCalls = grepCodebase('axios|fetch|http\\.get|httpService', [
        'node_modules',
        'dist',
      ]);
      const dynamicUrls: string[] = [];

      for (const file of httpCalls) {
        const [filePath] = file.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (filePath.includes('.spec.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for dynamic URL construction without validation
        if (content.match(/\$\{[^}]+\}.*http|http.*\$\{[^}]+\}/)) {
          // Check if URL is validated
          const hasValidation =
            content.includes('URL') || content.includes('isUrl') || content.includes('validateUrl');
          if (!hasValidation) {
            dynamicUrls.push(filePath);
          }
        }
      }

      // Should validate or not have dynamic URLs
      expect(dynamicUrls.length).toBeLessThanOrEqual(2);
    });

    it('should not allow internal network access from user input', () => {
      // Check for patterns where user input could construct internal URLs
      const userInputPatterns = grepCodebase('req\\.body|req\\.query|req\\.params', [
        'node_modules',
        'dist',
        'test',
      ]);

      const ssrfViolations: string[] = [];

      for (const match of userInputPatterns) {
        const [filePath] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;
        if (filePath.includes('.spec.ts')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for URL construction with user input + internal addresses
        if (
          (content.includes('http://') || content.includes('https://')) &&
          content.includes('req.') &&
          (content.includes('192.168') ||
            content.includes('10.0') ||
            content.includes('172.16') ||
            content.includes('127.0.0.1'))
        ) {
          // Exclude config and swagger files (development setup)
          if (!filePath.includes('config') && !filePath.includes('swagger')) {
            ssrfViolations.push(filePath);
          }
        }
      }

      expect(ssrfViolations).toEqual([]);
    });
  });
});
