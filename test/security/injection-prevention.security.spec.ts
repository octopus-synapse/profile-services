/**
 * Injection Prevention Security Tests
 *
 * Static analysis tests for SQL injection, NoSQL injection, command injection,
 * and XSS vulnerabilities.
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

describe('SQL Injection Prevention', () => {
  describe('Raw Query Detection', () => {
    it('should not use $queryRaw without parameterization', () => {
      const rawQueries = grepCodebaseFixed('$queryRaw', ['node_modules', 'dist', 'test']);
      const unsafeQueries: string[] = [];

      for (const match of rawQueries) {
        const [filePath, lineNum] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const lineIndex = parseInt(lineNum, 10) - 1;

        if (lineIndex >= 0 && lineIndex < lines.length) {
          const line = lines[lineIndex];
          // Check if it uses tagged template literal (safe) vs string concatenation (unsafe)
          if (line.includes('$queryRaw`') || line.includes('$queryRaw(Prisma.sql`')) {
          } else if (line.includes('$queryRaw(') && !line.includes('Prisma.sql')) {
            unsafeQueries.push(match);
          }
        }
      }

      expect(unsafeQueries).toEqual([]);
    });

    it('should not use $executeRaw without parameterization', () => {
      const rawExecutes = grepCodebaseFixed('$executeRaw', ['node_modules', 'dist', 'test']);
      const unsafeExecutes: string[] = [];

      for (const match of rawExecutes) {
        const [filePath, lineNum] = match.split(':');
        if (!filePath || !fileExists(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const lineIndex = parseInt(lineNum, 10) - 1;

        if (lineIndex >= 0 && lineIndex < lines.length) {
          const line = lines[lineIndex];
          if (line.includes('$executeRaw`') || line.includes('$executeRaw(Prisma.sql`')) {
          } else if (line.includes('$executeRaw(') && !line.includes('Prisma.sql')) {
            unsafeExecutes.push(match);
          }
        }
      }

      expect(unsafeExecutes).toEqual([]);
    });

    it('should not use string concatenation in Prisma where clauses', () => {
      const prismaFiles = readAllTsFiles(SRC_DIR).filter(
        (f) => f.includes('repository') || f.includes('service'),
      );
      const unsafeWheres: string[] = [];

      for (const file of prismaFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Pattern: where clause with string concatenation
        const unsafePatterns = [
          /where:\s*\{[^}]*\+\s*\w+[^}]*\}/g,
          /where:\s*`[^`]*\$\{[^`]*`/g,
          /where:\s*['"][^'"]*\+/g,
        ];

        for (const pattern of unsafePatterns) {
          if (pattern.test(content)) {
            unsafeWheres.push(file);
            break;
          }
        }
      }

      expect(unsafeWheres).toEqual([]);
    });

    it('should not use dynamic field names from user input', () => {
      const files = readAllTsFiles(SRC_DIR).filter(
        (f) => f.includes('service') || f.includes('repository'),
      );
      const dynamicFields: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for [variable] access in Prisma operations with user input
        const dangerousPatterns = [
          /prisma\.\w+\.(findMany|findFirst|findUnique|update|delete)\([^)]*\[[^\]]*req\./g,
          /prisma\.\w+\.(findMany|findFirst|findUnique|update|delete)\([^)]*\[[^\]]*body\./g,
          /prisma\.\w+\.(findMany|findFirst|findUnique|update|delete)\([^)]*\[[^\]]*query\./g,
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(content)) {
            dynamicFields.push(file);
            break;
          }
        }
      }

      expect(dynamicFields).toEqual([]);
    });
  });

  describe('Query Builder Safety', () => {
    it('should use Prisma ORM for database operations', () => {
      // Check for prisma method calls using fixed string search
      const prismaUsage = grepCodebaseFixed('this.prisma.', ['node_modules', 'dist', 'test']);

      // Most database operations should go through Prisma
      expect(prismaUsage.length).toBeGreaterThan(10);
    });
  });
});

describe('NoSQL Injection Prevention', () => {
  it('should not use eval or Function constructor with user input', () => {
    const evalUsage = grepCodebase('eval\\(|new Function\\(', ['node_modules', 'dist', 'test']);
    const unsafeEval = evalUsage.filter((e) => !e.includes('.spec.ts') && !e.includes('.test.ts'));
    expect(unsafeEval).toEqual([]);
  });

  it('should sanitize regex patterns from user input', () => {
    const regexUsage = grepCodebase('new RegExp|RegExp\\(', ['node_modules', 'dist']);
    const unsafeRegex: string[] = [];

    for (const match of regexUsage) {
      const [filePath] = match.split(':');
      if (!filePath || !fileExists(filePath)) continue;
      if (filePath.includes('.spec.ts')) continue;

      const content = fs.readFileSync(filePath, 'utf-8');

      // Check if RegExp uses user input directly
      if (
        content.match(/new RegExp\s*\(\s*\w+\.query/) ||
        content.match(/new RegExp\s*\(\s*\w+\.body/) ||
        content.match(/new RegExp\s*\(\s*req\./)
      ) {
        // Check for escaping
        const hasEscape =
          content.includes('escapeRegExp') ||
          content.includes('escape(') ||
          content.includes('sanitize');
        if (!hasEscape) {
          unsafeRegex.push(filePath);
        }
      }
    }

    expect(unsafeRegex).toEqual([]);
  });
});

describe('Command Injection Prevention', () => {
  it('should not use child_process in application code', () => {
    const childProcess = grepCodebaseFixed("from 'child_process'", [
      'node_modules',
      'dist',
      'test',
      'scripts',
    ]);
    const appUsage = childProcess.filter(
      (c) => !c.includes('.spec.ts') && !c.includes('.test.ts') && !c.includes('scripts/'),
    );
    expect(appUsage).toEqual([]);
  });

  it('should not use exec/spawn with user input', () => {
    const execUsage = grepCodebase('exec\\(|execSync\\(|spawn\\(|spawnSync\\(', [
      'node_modules',
      'dist',
      'test',
      'scripts',
    ]);
    const appUsage = execUsage.filter((e) => !e.includes('.spec.ts') && !e.includes('scripts/'));
    expect(appUsage).toEqual([]);
  });

  it('should not use shell commands in application code', () => {
    const shellUsage = grepCodebase('shell:\\s*true|shell=true', [
      'node_modules',
      'dist',
      'test',
      'scripts',
    ]);
    expect(shellUsage).toEqual([]);
  });
});

describe('XSS Prevention', () => {
  describe('Output Encoding', () => {
    it('should not use innerHTML directly with user content in controllers/services', () => {
      const innerHtml = grepCodebaseFixed('innerHTML', ['node_modules', 'dist']);
      // Filter out Puppeteer/browser context files used for PDF export and scraping
      const violations = innerHtml.filter(
        (h) =>
          (!h.includes('export/') &&
            !h.includes('cloudflare') &&
            !h.includes('puppeteer') &&
            !h.includes('helper') &&
            h.includes('.controller.ts')) ||
          h.includes('.service.ts'),
      );
      expect(violations).toEqual([]);
    });

    it('should not render raw HTML from database', () => {
      const files = readAllTsFiles(SRC_DIR).filter(
        (f) => f.includes('service') || f.includes('controller'),
      );
      const rawHtmlRender: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for rendering user content as HTML without sanitization
        if (content.includes('dangerouslySetInnerHTML') || content.includes('v-html')) {
          const hasSanitize =
            content.includes('sanitize') ||
            content.includes('DOMPurify') ||
            content.includes('escape');
          if (!hasSanitize) {
            rawHtmlRender.push(file);
          }
        }
      }

      expect(rawHtmlRender).toEqual([]);
    });
  });

  describe('Content Security', () => {
    it('should use helmet for security headers', () => {
      // Helmet may be configured in a separate security config module
      const helmetUsage = grepCodebaseFixed('helmet', ['node_modules', 'dist', 'test']);
      expect(helmetUsage.length).toBeGreaterThan(0);
    });

    it('should not use document.write', () => {
      const docWrite = grepCodebaseFixed('document.write', ['node_modules', 'dist']);
      expect(docWrite).toEqual([]);
    });
  });

  describe('Template Safety', () => {
    it('should not use dangerous template patterns in controllers', () => {
      // Check only controllers for unsafe template patterns
      const controllers = readAllTsFiles(SRC_DIR).filter((f) => f.includes('.controller.ts'));
      const unsafePatterns: string[] = [];

      for (const file of controllers) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for direct HTML string construction with user input
        if (
          content.includes('dangerouslySetInnerHTML') ||
          (content.includes('innerHTML') && content.includes('req.body'))
        ) {
          unsafePatterns.push(file);
        }
      }

      expect(unsafePatterns).toEqual([]);
    });
  });

  describe('JSON Response Safety', () => {
    it('should use NestJS response handling', () => {
      // NestJS automatically handles JSON serialization
      const controllers = grepCodebaseFixed('@Controller', ['node_modules', 'dist', 'test']);
      expect(controllers.length).toBeGreaterThan(0);
    });
  });
});

describe('Path Traversal Prevention', () => {
  it('should not use user input directly in file paths', () => {
    const fileOps = grepCodebase('readFile|writeFile|createReadStream|createWriteStream', [
      'node_modules',
      'dist',
      'test',
    ]);
    const unsafePaths: string[] = [];

    for (const match of fileOps) {
      const [filePath] = match.split(':');
      if (!filePath || !fileExists(filePath)) continue;
      if (filePath.includes('.spec.ts')) continue;

      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for path from user input
      if (
        content.match(/readFile.*req\./) ||
        content.match(/writeFile.*req\./) ||
        content.match(/path\.join.*req\./)
      ) {
        // Check for path sanitization
        const hasSanitization =
          content.includes('path.normalize') ||
          content.includes('path.resolve') ||
          content.includes('sanitize') ||
          content.includes('basename');
        if (!hasSanitization) {
          unsafePaths.push(filePath);
        }
      }
    }

    expect(unsafePaths).toEqual([]);
  });

  it('should not use user input for path traversal', () => {
    // Check for dangerous patterns where user input affects file paths
    const fileOperations = grepCodebase('path\\.join.*req\\.|path\\.resolve.*req\\.', [
      'node_modules',
      'dist',
      'test',
    ]);
    const violations = fileOperations.filter((f) => {
      const [filePath] = f.split(':');
      if (!filePath || !fileExists(filePath)) return false;

      const content = fs.readFileSync(filePath, 'utf-8');
      // Check if there's sanitization
      return (
        !content.includes('basename') &&
        !content.includes('normalize') &&
        !content.includes('sanitize')
      );
    });
    expect(violations).toEqual([]);
  });
});

describe('LDAP Injection Prevention', () => {
  it('should not use LDAP with user input without sanitization', () => {
    const ldapUsage = grepCodebase('ldap|LDAP', ['node_modules', 'dist']);
    expect(ldapUsage).toEqual([]);
  });
});

describe('XML Injection Prevention', () => {
  it('should not parse XML with external entities enabled', () => {
    const xmlParsing = grepCodebase('parseXML|DOMParser|xml2js', ['node_modules', 'dist']);
    const unsafeXml: string[] = [];

    for (const match of xmlParsing) {
      const [filePath] = match.split(':');
      if (!filePath || !fileExists(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for XXE protection
      if (content.includes('DOMParser') || content.includes('parseXML')) {
        const hasXxeProtection =
          content.includes('noent: false') ||
          content.includes('disableExternalEntities') ||
          content.includes('FEATURE_EXTERNAL_GENERAL_ENTITIES');
        if (!hasXxeProtection) {
          unsafeXml.push(filePath);
        }
      }
    }

    expect(unsafeXml).toEqual([]);
  });
});

describe('Template Injection Prevention', () => {
  it('should not use template engines with user-controlled templates', () => {
    const templateEngines = grepCodebase('handlebars|ejs|pug|mustache|nunjucks', [
      'node_modules',
      'dist',
    ]);
    const unsafeTemplates: string[] = [];

    for (const match of templateEngines) {
      const [filePath] = match.split(':');
      if (!filePath || !fileExists(filePath)) continue;
      if (filePath.includes('.spec.ts')) continue;

      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for user-controlled templates
      if (
        content.includes('compile(') &&
        (content.includes('req.body') || content.includes('user'))
      ) {
        unsafeTemplates.push(filePath);
      }
    }

    expect(unsafeTemplates).toEqual([]);
  });
});
