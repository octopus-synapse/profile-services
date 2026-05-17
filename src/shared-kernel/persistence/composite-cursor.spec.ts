import { describe, expect, it } from 'bun:test';
import { decodeCursor, encodeCursor, tryDecodeCursor } from './composite-cursor';

describe('composite-cursor', () => {
  describe('encodeCursor', () => {
    it('produces a stable url-safe string', () => {
      const cursor = encodeCursor(new Date('2026-05-17T12:34:56.000Z'), 'post-123');
      expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('rejects an invalid Date', () => {
      expect(() => encodeCursor(new Date('not-a-date'), 'id')).toThrow(TypeError);
    });

    it('rejects an empty id', () => {
      expect(() => encodeCursor(new Date(), '')).toThrow(TypeError);
    });
  });

  describe('decodeCursor', () => {
    it('round-trips through encodeCursor', () => {
      const at = new Date('2026-05-17T12:34:56.000Z');
      const decoded = decodeCursor(encodeCursor(at, 'post-42'));
      expect(decoded.createdAt.toISOString()).toBe(at.toISOString());
      expect(decoded.id).toBe('post-42');
    });

    it('throws on malformed base64', () => {
      expect(() => decodeCursor('not-base64!@#$%^&*()')).toThrow(TypeError);
    });

    it('throws on a payload that lacks {c, i}', () => {
      const bad = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf8').toString('base64url');
      expect(() => decodeCursor(bad)).toThrow(TypeError);
    });

    it('throws when the encoded createdAt is invalid', () => {
      const bad = Buffer.from(JSON.stringify({ c: 'nope', i: 'x' }), 'utf8').toString('base64url');
      expect(() => decodeCursor(bad)).toThrow(TypeError);
    });
  });

  describe('tryDecodeCursor', () => {
    it('returns null when the input is empty or undefined', () => {
      expect(tryDecodeCursor(null)).toBeNull();
      expect(tryDecodeCursor(undefined)).toBeNull();
      expect(tryDecodeCursor('')).toBeNull();
    });

    it('returns null on malformed input rather than throwing', () => {
      expect(tryDecodeCursor('not-base64!@#$%^&*()')).toBeNull();
    });

    it('returns the decoded shape when the cursor is valid', () => {
      const cursor = encodeCursor(new Date('2026-05-17T00:00:00.000Z'), 'p1');
      expect(tryDecodeCursor(cursor)).toEqual({
        createdAt: new Date('2026-05-17T00:00:00.000Z'),
        id: 'p1',
      });
    });
  });

  describe('tiebreaker semantics (deterministic pagination)', () => {
    it('produces distinct cursors for posts sharing createdAt', () => {
      const at = new Date('2026-05-17T00:00:00.000Z');
      const cursorA = encodeCursor(at, 'a');
      const cursorB = encodeCursor(at, 'b');
      expect(cursorA).not.toBe(cursorB);
      expect(decodeCursor(cursorA).id).toBe('a');
      expect(decodeCursor(cursorB).id).toBe('b');
    });
  });
});
