/**
 * AES-256-GCM symmetric cipher with per-row IV and authentication tag.
 *
 * Used to encrypt 3rd-party OAuth access/refresh tokens before persisting
 * them on `Account` rows. A leaked DB dump must not yield usable GitHub /
 * LinkedIn tokens.
 *
 * Output format (single base64 string, single column):
 *   `v1.<iv_b64>.<tag_b64>.<ciphertext_b64>`
 *
 * The `v1.` prefix lets us rotate algorithms or key derivation in the future
 * without breaking decryption of legacy ciphertexts.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits is the recommended IV size for GCM
const PREFIX = 'v1';

export class AesGcmCipher {
  /**
   * @param key 32 raw bytes (e.g. `Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'base64')`).
   */
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error('AesGcmCipher requires a 32-byte key');
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}.${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
  }

  /**
   * Returns the plaintext, or `null` if `ciphertext` doesn't look like a v1
   * payload OR fails authentication. Caller must treat `null` as "not
   * recoverable" — legacy rows with plaintext secrets, ciphertext from a
   * rotated key, or tampered data all collapse into this case.
   */
  decrypt(ciphertext: string): string | null {
    if (!ciphertext) return null;
    const parts = ciphertext.split('.');
    if (parts.length !== 4 || parts[0] !== PREFIX) return null;
    const iv = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    const enc = Buffer.from(parts[3], 'base64');
    if (iv.length !== IV_LENGTH) return null;
    try {
      const decipher = createDecipheriv(ALGO, this.key, iv);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
      return dec.toString('utf8');
    } catch {
      // GCM auth tag mismatch (tampered ciphertext / wrong key / legacy
      // plaintext masquerading as a v1 payload) — treat as unrecoverable.
      return null;
    }
  }
}

/**
 * Cipher that no-ops (passthrough) when no key is configured. Used in dev to
 * avoid requiring `TOKEN_ENCRYPTION_KEY` for every local boot. Production
 * composition root MUST construct `AesGcmCipher` directly with a real key.
 */
export class NoopCipher {
  encrypt(plaintext: string): string {
    return plaintext;
  }

  decrypt(ciphertext: string): string | null {
    // Treat plaintext as already-decrypted to keep dev DB rows readable.
    return ciphertext;
  }
}

export type CipherPort = AesGcmCipher | NoopCipher;
