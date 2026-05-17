import { describe, expect, it } from 'bun:test';
import { DEFAULT_RANDOM_ALPHABET, secureRandomCode } from './secure-random';

describe('secureRandomCode', () => {
  it('returns a string of the requested length', () => {
    const code = secureRandomCode(10);
    expect(code).toHaveLength(10);
  });

  it('rejects length < 1', () => {
    expect(() => secureRandomCode(0)).toThrow(RangeError);
    expect(() => secureRandomCode(-1)).toThrow(RangeError);
  });

  it('rejects empty alphabet', () => {
    expect(() => secureRandomCode(5, '')).toThrow(RangeError);
  });

  it('draws only from the supplied alphabet', () => {
    const code = secureRandomCode(200, 'abc');
    for (const ch of code) {
      expect('abc').toContain(ch);
    }
  });

  it('uses the default Crockford-style alphabet when none is provided', () => {
    const code = secureRandomCode(300);
    for (const ch of code) {
      expect(DEFAULT_RANDOM_ALPHABET).toContain(ch);
    }
  });

  it('produces approximately uniform output over a binary alphabet', () => {
    // 1000 draws on alphabet '01' → expect ~500/500. Allow ±5% drift
    // before failing — the test is statistical and a tight bound would
    // flake occasionally on legitimate CSPRNG output.
    let zeros = 0;
    let ones = 0;
    for (let i = 0; i < 1000; i++) {
      const ch = secureRandomCode(1, '01');
      if (ch === '0') zeros++;
      else if (ch === '1') ones++;
    }
    expect(zeros + ones).toBe(1000);
    expect(zeros).toBeGreaterThan(450);
    expect(zeros).toBeLessThan(550);
    expect(ones).toBeGreaterThan(450);
    expect(ones).toBeLessThan(550);
  });

  it('produces high-entropy strings (no obvious repetition)', () => {
    // Generate 100 codes and assert they're all distinct. Probability of
    // a collision with the default 32-char alphabet at length 16 is
    // ~100^2 / (2 * 32^16) ≈ 10^-22 — a flake here means the RNG is
    // genuinely broken.
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(secureRandomCode(16));
    }
    expect(codes.size).toBe(100);
  });
});
