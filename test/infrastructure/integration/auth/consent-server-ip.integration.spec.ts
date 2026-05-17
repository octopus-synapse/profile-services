/**
 * P1 #14 — POST /v1/users/me/accept-consent must source `ipAddress`
 * and `userAgent` from the server-side request context, never from
 * the client body. The audit trail backs LGPD compliance; a forged
 * IP would let an attacker frame a different network for a
 * disputed consent.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { closeApp, createTestUserAndLogin, getApp, getPrisma, getRequest } from '../setup';

describe('P1 #14 — accept-consent ignores body.ipAddress', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await getApp();
    const auth = await createTestUserAndLogin();
    token = auth.accessToken;
    userId = auth.userId;
  });

  afterAll(async () => {
    await closeApp();
  });

  it('rejects body.ipAddress at the schema layer', async () => {
    // Strict schema — extra body fields could be ignored by zod's
    // default `.passthrough()` semantics, but Elysia's parser uses
    // `.strip()` so the field is dropped silently. Either way, the
    // persisted audit row must reflect ctx.ip, not the body value.
    const res = await getRequest()
      .post('/api/v1/users/me/accept-consent')
      .set('Authorization', `Bearer ${token}`)
      .send({
        documentType: 'TERMS_OF_SERVICE',
        // P1 #14 attempt: forge an IP. Schema drops it.
        ipAddress: '1.2.3.4',
        userAgent: 'Attacker/1.0',
      });

    expect([200, 201]).toContain(res.status);

    const prisma = getPrisma();
    const consent = await prisma.userConsent.findFirst({
      where: { userId, documentType: 'TERMS_OF_SERVICE' },
      orderBy: { acceptedAt: 'desc' },
    });
    expect(consent).not.toBeNull();
    expect(consent?.ipAddress).not.toBe('1.2.3.4');
    expect(consent?.userAgent).not.toBe('Attacker/1.0');
  });
});
