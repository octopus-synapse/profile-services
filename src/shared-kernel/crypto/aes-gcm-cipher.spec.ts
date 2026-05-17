import { describe, expect, it } from 'bun:test';
import { randomBytes } from 'node:crypto';
import { AesGcmCipher, NoopCipher } from './aes-gcm-cipher.adapter';

const key = randomBytes(32);

describe('AesGcmCipher', () => {
  it('round-trips plaintext through encrypt → decrypt', () => {
    const c = new AesGcmCipher(key);
    const ct = c.encrypt('gho_abc123');
    expect(ct).not.toBe('gho_abc123');
    expect(ct.startsWith('v1.')).toBe(true);
    expect(c.decrypt(ct)).toBe('gho_abc123');
  });

  it('never includes the plaintext as a substring of the ciphertext', () => {
    const c = new AesGcmCipher(key);
    expect(c.encrypt('secret-value-xyz').includes('secret-value-xyz')).toBe(false);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const c = new AesGcmCipher(key);
    expect(c.encrypt('same')).not.toBe(c.encrypt('same'));
  });

  it('returns null for legacy plaintext that looks nothing like v1.', () => {
    const c = new AesGcmCipher(key);
    expect(c.decrypt('gho_legacy_plaintext')).toBeNull();
  });

  it('returns null for tampered ciphertext', () => {
    const c = new AesGcmCipher(key);
    const ct = c.encrypt('abc');
    const tampered = `${ct.slice(0, -2)}XX`;
    expect(c.decrypt(tampered)).toBeNull();
  });

  it('returns null when decrypted with the wrong key', () => {
    const a = new AesGcmCipher(key);
    const b = new AesGcmCipher(randomBytes(32));
    expect(b.decrypt(a.encrypt('abc'))).toBeNull();
  });

  it('rejects a non-32-byte key at construction time', () => {
    expect(() => new AesGcmCipher(Buffer.alloc(16))).toThrow();
  });

  it('NoopCipher returns the same string for both encrypt and decrypt', () => {
    const n = new NoopCipher();
    expect(n.encrypt('abc')).toBe('abc');
    expect(n.decrypt('abc')).toBe('abc');
  });
});
