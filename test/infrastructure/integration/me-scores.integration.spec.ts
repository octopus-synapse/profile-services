import { describe, expect, it } from 'bun:test';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp } from './setup';

/**
 * Order-independent suite for the unified scores endpoints
 * (`GET /v1/me/scores` and `GET /v1/resumes/:id/scores`). Each test
 * provisions its own user (+ resume) so they can run concurrently.
 */

/** Create a resume owned by `userId` and mark it the user's primary. */
async function seedPrimaryResume(app: TestApp, userId: string): Promise<string> {
  const resume = await app.prisma.resume.create({
    data: { userId, title: 'Scores Test Resume', contentPtBr: { sections: [] } },
  });
  await app.prisma.user.update({
    where: { id: userId },
    data: { primaryResumeId: resume.id },
  });
  return resume.id;
}

const RANKS = ['S', 'A', 'B', 'C', 'D', 'F'];

describe('GET /v1/me/scores', () => {
  it('returns a cold-start payload (nulls) for a user with no master resume', async () => {
    const app = await getApp();
    const user = await freshInDbUser(app);

    const res = await app.request.get('/api/v1/me/scores').set(user.bearer());

    expect(res.status).toBe(200);
    expect(res.body.resumeId).toBeNull();
    expect(res.body.quality).toBeNull();
    expect(res.body.style).toBeNull();
    expect(res.body.fit.status).toBe('never');
    expect(RANKS).toContain(res.body.rank);
    expect(typeof res.body.readiness.score).toBe('number');
    expect(RANKS).toContain(res.body.readiness.rank);
  });

  it('resolves the master resume and returns its scores', async () => {
    const app = await getApp();
    const user = await freshInDbUser(app);
    const resumeId = await seedPrimaryResume(app, user.userId);

    const res = await app.request.get('/api/v1/me/scores').set(user.bearer());

    expect(res.status).toBe(200);
    expect(res.body.resumeId).toBe(resumeId);
    expect(RANKS).toContain(res.body.rank);
    // Style is null until a style is attached; readiness always present.
    expect(res.body.readiness).toBeDefined();
    expect(Number.isNaN(res.body.readiness.score)).toBe(false);
  });

  it('rejects unauthenticated access', async () => {
    const app = await getApp();
    const res = await app.request.get('/api/v1/me/scores');
    expect(res.status).toBe(401);
  });
});

describe('GET /v1/resumes/:id/scores', () => {
  it('returns scores for a resume the caller owns', async () => {
    const app = await getApp();
    const user = await freshInDbUser(app);
    const resumeId = await seedPrimaryResume(app, user.userId);

    const res = await app.request.get(`/api/v1/resumes/${resumeId}/scores`).set(user.bearer());

    expect(res.status).toBe(200);
    expect(res.body.resumeId).toBe(resumeId);
    expect(RANKS).toContain(res.body.rank);
  });

  it("rejects reading another user's resume scores (403)", async () => {
    const app = await getApp();
    const owner = await freshInDbUser(app);
    const other = await freshInDbUser(app);
    const resumeId = await seedPrimaryResume(app, owner.userId);

    const res = await app.request.get(`/api/v1/resumes/${resumeId}/scores`).set(other.bearer());

    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated access', async () => {
    const app = await getApp();
    const user = await freshInDbUser(app);
    const resumeId = await seedPrimaryResume(app, user.userId);

    const res = await app.request.get(`/api/v1/resumes/${resumeId}/scores`);

    expect(res.status).toBe(401);
  });
});
