/**
 * Regression suite for the P2 security hardening pass executed against
 * `BUG_REPORT.md`. Each test below pins one specific finding so a future
 * refactor that reintroduces the vulnerability fails CI loudly instead
 * of silently regressing security posture.
 *
 * One block per finding — keep the docstring aligned with the
 * BUG_REPORT.md heading so reviewers can cross-reference.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC = path.resolve(__dirname, '../../../src');

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf-8');
}

describe('BUG_REPORT P2 — security regression pins', () => {
  describe('Signup token leak (account-lifecycle)', () => {
    it('CreateAccountResult does not expose access/refresh tokens', () => {
      const port = read(
        'bounded-contexts/identity/account-lifecycle/application/ports/create-account.port.ts',
      );
      expect(port).not.toContain('accessToken');
      expect(port).not.toContain('refreshToken');
      expect(port).not.toContain('expiresIn');
    });

    it('the signup response schema is identity-only', () => {
      const schema = read(
        'bounded-contexts/identity/account-lifecycle/application/use-cases/create-account/create-account.schema.ts',
      );
      const routeSchema = read(
        'bounded-contexts/identity/account-lifecycle/account-lifecycle.routes.schemas.ts',
      );
      expect(schema).not.toContain('accessToken');
      expect(routeSchema).not.toContain('accessToken');
    });

    it('the route handler does not return tokens in the body', () => {
      const route = read('bounded-contexts/identity/account-lifecycle/account-lifecycle.routes.ts');
      // Search only the createAccount handler region — token references
      // elsewhere (e.g. comments on other endpoints) are not regressions.
      const handlerStart = route.indexOf("path: '/v1/accounts'");
      const handlerEnd = route.indexOf('/v1/accounts/deactivate');
      const handler = route.slice(handlerStart, handlerEnd);
      expect(handler).not.toContain('accessToken');
      expect(handler).not.toContain('refreshToken');
    });
  });

  describe('JWT_ISSUER / JWT_AUDIENCE — required in production', () => {
    it('config schema fails fast when either is missing in NODE_ENV=production', () => {
      const schema = read('shared-kernel/config/config.schema.ts');
      expect(schema).toContain('JWT_ISSUER is required in production');
      expect(schema).toContain('JWT_AUDIENCE is required in production');
    });
  });

  describe('RefreshToken at rest — sha-256 only', () => {
    it('repository hashes plaintext before persisting and looks up by hash', () => {
      const repo = read(
        'bounded-contexts/identity/authentication/infrastructure/adapters/prisma-authentication.repository.ts',
      );
      expect(repo).toContain('hashToken(plaintext)');
      // No raw insert of the user-facing token string.
      expect(repo).not.toMatch(/data:\s*\{[^}]*token:\s*plaintext/);
    });
  });

  describe('Content-Disposition — RFC 5987 encoding', () => {
    it('presigned download uses filename* (UTF-8) and a sanitised ASCII fallback', () => {
      const svc = read('bounded-contexts/platform/common/services/s3-upload.service.ts');
      expect(svc).toContain("filename*=UTF-8''");
      // The naïve quote-only replace is gone.
      expect(svc).not.toContain("filename.replace(/\"/g, '')");
    });
  });

  describe('Upload magic bytes — GIF coverage', () => {
    it('file-validator inspects the GIF header for image/gif uploads', () => {
      const v = read('bounded-contexts/integration/upload/domain/services/file-validator.ts');
      expect(v).toContain("file.mimetype === 'image/gif'");
      expect(v).toContain('474946383');
    });

    it('the exception code accepts bad_magic_gif as a reason', () => {
      const ex = read('bounded-contexts/integration/domain/exceptions/integration.exceptions.ts');
      expect(ex).toContain("'bad_magic_gif'");
    });
  });

  describe('DELETE /v1/upload/file/:key — path-traversal hardening', () => {
    it('the route schema constrains the key alphabet and rejects ..', () => {
      const route = read('bounded-contexts/integration/upload/upload.routes.ts');
      expect(route).toContain('STORAGE_KEY_REGEX');
      expect(route).toContain("!k.includes('..')");
    });

    it('the use case no longer lazy-backfills ownership on legacy keys', () => {
      const uc = read(
        'bounded-contexts/integration/upload/application/use-cases/delete-upload/delete-upload.use-case.ts',
      );
      // No path-inference or write-on-read — those were the exact moves
      // that gave the phantom-claim. The docstring above the class is
      // allowed to reference the historic "lazy-backfill" wording so
      // future readers can find the context.
      expect(uc).not.toContain('inferOwnerFromKeyPath');
      expect(uc).not.toContain('recordIfMissing');
    });
  });
});
