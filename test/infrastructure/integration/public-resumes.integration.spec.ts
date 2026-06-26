import { describe, expect, it } from 'bun:test';
import type { FreshUser } from '../shared/fresh-context';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp, uniqueTestSlug } from './setup';

/**
 * Order-independent public-resumes suite. Each test provisions its own
 * user + resume (+ shares) so it owns its fixtures for its lifetime —
 * Bun runs tests inside a `describe` concurrently (1.3+), so any shared
 * `let resumeId/shareSlug` would race and read before it's written.
 */

interface ResumeFixture {
  readonly user: FreshUser;
  readonly resumeId: string;
}

/** Create a brand-new user + resume with the given title, owned by the test. */
async function seedUserResume(app: TestApp, title = 'Test Resume'): Promise<ResumeFixture> {
  const user = await freshInDbUser(app);
  const resume = await app.prisma.resume.create({
    data: {
      userId: user.userId,
      title,
      contentPtBr: { sections: [] },
    },
  });
  return { user, resumeId: resume.id };
}

describe('Public Resumes Integration', () => {
  describe('Share Management Flow', () => {
    it('should create a public share with custom slug', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const slug = uniqueTestSlug('awesome');

      const response = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({
          resumeId,
          slug,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      // Response shape was unified to the canonical `{ success, data: { share } }`
      // envelope by the backend-audit hardening PR (#213). The duplicated
      // top-level fields (slug, resumeId, isActive, publicUrl) are gone.
      expect(response.status).toBe(201);
      expect(response.body.share.slug).toBe(slug);
      expect(response.body.share.resumeId).toBe(resumeId);
      expect(response.body.share.isActive).toBe(true);
      expect(response.body.share).toHaveProperty('publicUrl');
    });

    it('should create a password-protected share', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);

      const response = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, password: 'secret123' });

      expect(response.status).toBe(201);
      expect(response.body.share).toHaveProperty('slug');
      expect(response.body.share.hasPassword).toBe(true);
    });

    it('should list user shares for a resume', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);

      // Seed two shares for this resume so the list has >= 2 entries.
      await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: uniqueTestSlug('list-a') });
      await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, password: 'secret123' });

      const response = await app.request
        .get(`/api/v1/shares/resume/${resumeId}`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.shares)).toBe(true);
      expect(response.body.shares.length).toBeGreaterThanOrEqual(2);
      expect(response.body.shares[0]).toHaveProperty('slug');
      expect(response.body.shares[0]).toHaveProperty('resumeId');
    });

    it('should access public resume via slug', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const slug = uniqueTestSlug('access');

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug });
      expect(create.status).toBe(201);

      const response = await app.request.get(`/api/v1/public/resumes/${slug}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('resume');
      expect(response.body.resume.id).toBe(resumeId);
      expect(response.body.resume.title).toBe('Test Resume');
    });

    it('should require password for protected shares', async () => {
      const app = await getApp();
      const { resumeId } = await seedUserResume(app);

      // Create password-protected share directly
      const hashedPassword = await Bun.password.hash('secret123', {
        algorithm: 'bcrypt',
        cost: 10,
      });

      const protectedShare = await app.prisma.resumeShare.create({
        data: { resumeId, slug: uniqueTestSlug('protected'), password: hashedPassword },
      });

      const failResponse = await app.request.get(`/api/v1/public/resumes/${protectedShare.slug}`);
      expect(failResponse.status).toBe(403);

      const successResponse = await app.request
        .get(`/api/v1/public/resumes/${protectedShare.slug}`)
        .set('x-share-password', 'secret123');

      expect(successResponse.status).toBe(200);
      expect(successResponse.body.resume.id).toBe(resumeId);
    });

    it('should return 410 for expired shares', async () => {
      const app = await getApp();
      const { resumeId } = await seedUserResume(app);
      const expiredShare = await app.prisma.resumeShare.create({
        data: { resumeId, slug: uniqueTestSlug('expired'), expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await app.request.get(`/api/v1/public/resumes/${expiredShare.slug}`);
      // 410 Gone é semanticamente correto para recurso que existiu mas expirou.
      expect(response.status).toBe(410);
    });

    it('should delete a share', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const slug = uniqueTestSlug('to-delete');

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug });
      expect(create.status).toBe(201);

      const share = await app.prisma.resumeShare.findFirst({ where: { slug } });
      expect(share).not.toBeNull();
      if (!share) return;

      const response = await app.request.delete(`/api/v1/shares/${share.id}`).set(user.bearer());

      expect(response.status).toBe(200);

      const deleted = await app.prisma.resumeShare.findUnique({ where: { id: share.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('Slug Aliases', () => {
    it('should add an alias to the share', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const primarySlug = uniqueTestSlug('primary');
      const aliasSlug = uniqueTestSlug('alias');

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: primarySlug });
      expect(create.status).toBe(201);
      const share = await app.prisma.resumeShare.findUnique({ where: { slug: primarySlug } });
      if (!share) throw new Error('share was not persisted');

      const response = await app.request
        .post(`/api/v1/shares/${share.id}/aliases`)
        .set(user.bearer())
        .send({ slug: aliasSlug });

      expect(response.status).toBe(201);
      expect(response.body.alias.slug).toBe(aliasSlug);
      expect(response.body.alias.shareId).toBe(share.id);
    });

    it('should resolve the public resume via alias slug', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const primarySlug = uniqueTestSlug('primary');
      const aliasSlug = uniqueTestSlug('alias');

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: primarySlug });
      expect(create.status).toBe(201);
      const share = await app.prisma.resumeShare.findUnique({ where: { slug: primarySlug } });
      if (!share) throw new Error('share was not persisted');

      const addAlias = await app.request
        .post(`/api/v1/shares/${share.id}/aliases`)
        .set(user.bearer())
        .send({ slug: aliasSlug });
      expect(addAlias.status).toBe(201);

      const response = await app.request.get(`/api/v1/public/resumes/${aliasSlug}`);
      expect(response.status).toBe(200);
    });

    it('should keep primary slug working after alias is added', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const primarySlug = uniqueTestSlug('primary');
      const aliasSlug = uniqueTestSlug('alias');

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: primarySlug });
      expect(create.status).toBe(201);
      const share = await app.prisma.resumeShare.findUnique({ where: { slug: primarySlug } });
      if (!share) throw new Error('share was not persisted');

      const addAlias = await app.request
        .post(`/api/v1/shares/${share.id}/aliases`)
        .set(user.bearer())
        .send({ slug: aliasSlug });
      expect(addAlias.status).toBe(201);

      const response = await app.request.get(`/api/v1/public/resumes/${primarySlug}`);
      expect(response.status).toBe(200);
    });

    it('should reject alias slug already in use as a primary slug', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const primarySlug = uniqueTestSlug('primary');

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: primarySlug });
      expect(create.status).toBe(201);
      const share = await app.prisma.resumeShare.findUnique({ where: { slug: primarySlug } });
      if (!share) throw new Error('share was not persisted');

      const response = await app.request
        .post(`/api/v1/shares/${share.id}/aliases`)
        .set(user.bearer())
        .send({ slug: primarySlug });

      expect(response.status).toBe(409);
    });

    it('should list aliases for the share', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const primarySlug = uniqueTestSlug('primary');
      const aliasSlug = uniqueTestSlug('alias');

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: primarySlug });
      expect(create.status).toBe(201);
      const share = await app.prisma.resumeShare.findUnique({ where: { slug: primarySlug } });
      if (!share) throw new Error('share was not persisted');

      const addAlias = await app.request
        .post(`/api/v1/shares/${share.id}/aliases`)
        .set(user.bearer())
        .send({ slug: aliasSlug });
      expect(addAlias.status).toBe(201);

      const response = await app.request
        .get(`/api/v1/shares/${share.id}/aliases`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      expect(response.body.aliases.length).toBeGreaterThanOrEqual(1);
      expect(response.body.aliases.some((a: { slug: string }) => a.slug === aliasSlug)).toBe(true);
    });

    it('should remove the alias and stop resolving', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const primarySlug = uniqueTestSlug('primary');
      const aliasSlug = uniqueTestSlug('alias');

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: primarySlug });
      expect(create.status).toBe(201);
      const share = await app.prisma.resumeShare.findUnique({ where: { slug: primarySlug } });
      if (!share) throw new Error('share was not persisted');

      const addAlias = await app.request
        .post(`/api/v1/shares/${share.id}/aliases`)
        .set(user.bearer())
        .send({ slug: aliasSlug });
      expect(addAlias.status).toBe(201);

      const list = await app.request.get(`/api/v1/shares/${share.id}/aliases`).set(user.bearer());
      const target = list.body.aliases.find((a: { slug: string }) => a.slug === aliasSlug);
      expect(target).toBeDefined();

      const del = await app.request
        .delete(`/api/v1/shares/aliases/${target.id}`)
        .set(user.bearer());
      expect(del.status).toBe(200);

      const lookup = await app.request.get(`/api/v1/public/resumes/${aliasSlug}`);
      expect(lookup.status).toBe(404);
    });
  });

  describe('QR code', () => {
    it('should return a PNG QR code for the owner', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: uniqueTestSlug('qr') });
      expect(create.status).toBe(201);
      const share = await app.prisma.resumeShare.findUnique({
        where: { slug: create.body.share.slug },
      });
      if (!share) throw new Error('share was not persisted');

      const response = await app.request
        .get(`/api/v1/shares/${share.id}/qr.png`)
        .set(user.bearer())
        .responseType('blob');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('image/png');

      const body = response.body as Buffer;
      expect(Buffer.isBuffer(body)).toBe(true);
      expect(body.length).toBeGreaterThan(100);
      expect(body[0]).toBe(0x89);
      expect(body[1]).toBe(0x50);
      expect(body[2]).toBe(0x4e);
      expect(body[3]).toBe(0x47);
    });

    it('should reject QR request without auth', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: uniqueTestSlug('qr') });
      expect(create.status).toBe(201);
      const share = await app.prisma.resumeShare.findUnique({
        where: { slug: create.body.share.slug },
      });
      if (!share) throw new Error('share was not persisted');

      const response = await app.request.get(`/api/v1/shares/${share.id}/qr.png`);
      expect(response.status).toBe(401);
    });

    it('should return 404 for unknown shareId', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const response = await app.request
        .get('/api/v1/shares/019eee00-0000-0000-0000-000000000000/qr.png')
        .set(user.bearer());
      expect(response.status).toBe(404);
    });
  });

  describe('OG image', () => {
    it('should serve a PNG OG image without auth', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedUserResume(app);
      const ogSlug = uniqueTestSlug('og');

      const create = await app.request
        .post('/api/v1/shares')
        .set(user.bearer())
        .send({ resumeId, slug: ogSlug });
      expect(create.status).toBe(201);

      const response = await app.request
        .get(`/api/v1/public/resumes/${ogSlug}/og.png`)
        .responseType('blob');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('image/png');

      const body = response.body as Buffer;
      expect(Buffer.isBuffer(body)).toBe(true);
      expect(body.length).toBeGreaterThan(500);
      expect(body[0]).toBe(0x89);
      expect(body[1]).toBe(0x50);
      expect(body[2]).toBe(0x4e);
      expect(body[3]).toBe(0x47);
    });

    it('should return 404 for unknown slug', async () => {
      const app = await getApp();
      const response = await app.request.get('/api/v1/public/resumes/no-such-slug/og.png');
      expect(response.status).toBe(404);
    });
  });

  describe('Resume Caching', () => {
    it('should cache public resume data', async () => {
      const app = await getApp();
      const { resumeId } = await seedUserResume(app);
      const share = await app.prisma.resumeShare.create({
        data: { resumeId, slug: uniqueTestSlug('cached') },
      });

      // First call - should populate cache
      const firstResponse = await app.request.get(`/api/v1/public/resumes/${share.slug}`);
      expect(firstResponse.status).toBe(200);
      const firstResumeId = firstResponse.body.resume.id;

      // Second call - should use cache
      const secondResponse = await app.request.get(`/api/v1/public/resumes/${share.slug}`);
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.resume.id).toBe(firstResumeId);

      // Verify cache works by checking data consistency
      expect(secondResponse.body.resume).toEqual(firstResponse.body.resume);
    });
  });
});
