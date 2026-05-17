import { describe, expect, it } from 'bun:test';
import { JoseJwtAdapter } from './jose-jwt.adapter';

const PRIMARY = 'a'.repeat(48);
const PREVIOUS = 'b'.repeat(48);
const FOREIGN = 'c'.repeat(48);

describe('JoseJwtAdapter', () => {
  describe('signAsync / verifyAsync (single secret)', () => {
    it('verifies a token signed with the current secret', async () => {
      const adapter = new JoseJwtAdapter({ secret: PRIMARY });
      const token = await adapter.signAsync({ sub: 'user-1' });
      const payload = await adapter.verifyAsync<{ sub: string }>(token);
      expect(payload.sub).toBe('user-1');
    });

    it('rejects a token signed with a foreign secret', async () => {
      const foreign = new JoseJwtAdapter({ secret: FOREIGN });
      const verifier = new JoseJwtAdapter({ secret: PRIMARY });
      const token = await foreign.signAsync({ sub: 'user-1' });
      await expect(verifier.verifyAsync(token)).rejects.toThrow();
    });
  });

  describe('dual-secret rotation window', () => {
    it('accepts a token signed with the previous secret', async () => {
      const before = new JoseJwtAdapter({ secret: PREVIOUS });
      const after = new JoseJwtAdapter({ secret: PRIMARY, previousSecret: PREVIOUS });
      const token = await before.signAsync({ sub: 'user-1' });
      const payload = await after.verifyAsync<{ sub: string }>(token);
      expect(payload.sub).toBe('user-1');
    });

    it('still rejects a token signed with neither current nor previous', async () => {
      const foreign = new JoseJwtAdapter({ secret: FOREIGN });
      const verifier = new JoseJwtAdapter({ secret: PRIMARY, previousSecret: PREVIOUS });
      const token = await foreign.signAsync({ sub: 'user-1' });
      await expect(verifier.verifyAsync(token)).rejects.toThrow();
    });

    it('signs with the current secret (verifies under current, not previous)', async () => {
      const verifierA = new JoseJwtAdapter({ secret: PRIMARY, previousSecret: PREVIOUS });
      const verifierB = new JoseJwtAdapter({ secret: PREVIOUS }); // imagine: another instance still on the old secret
      const token = await verifierA.signAsync({ sub: 'user-1' });
      // verifierB only knows PREVIOUS and would fail against PRIMARY — confirms signer used PRIMARY.
      await expect(verifierB.verifyAsync(token)).rejects.toThrow();
    });

    it('surfaces non-signature failures unchanged (e.g. expired)', async () => {
      const adapter = new JoseJwtAdapter({ secret: PRIMARY, previousSecret: PREVIOUS });
      // Sign with expiresIn that already passed.
      const token = await adapter.signAsync({ sub: 'user-1' }, { expiresIn: -10 });
      await expect(adapter.verifyAsync(token)).rejects.toThrow(/exp/i);
    });

    it('a per-call options.secret bypasses the rotation fallback', async () => {
      const adapter = new JoseJwtAdapter({ secret: PRIMARY, previousSecret: PREVIOUS });
      const before = new JoseJwtAdapter({ secret: PREVIOUS });
      const token = await before.signAsync({ sub: 'user-1' });
      // Passing options.secret pins the verifier — fallback must NOT engage.
      await expect(adapter.verifyAsync(token, { secret: PRIMARY })).rejects.toThrow();
    });
  });
});
