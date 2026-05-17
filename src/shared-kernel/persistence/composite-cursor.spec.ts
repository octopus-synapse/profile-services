import { describe, expect, it } from 'bun:test';
import {
  compositeCursorWhere,
  decodeCursor,
  encodeCursor,
  nextCursorFromPage,
  tryDecodeCursor,
} from './composite-cursor';

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

  describe('compositeCursorWhere', () => {
    it('returns an empty fragment when cursor is absent', () => {
      expect(compositeCursorWhere(undefined)).toEqual({});
      expect(compositeCursorWhere(null)).toEqual({});
      expect(compositeCursorWhere('')).toEqual({});
    });

    it('emits the (createdAt, id) OR predicate when the cursor decodes', () => {
      const at = new Date('2026-05-17T00:00:00.000Z');
      const cursor = encodeCursor(at, 'p1');
      const where = compositeCursorWhere(cursor);
      expect(where).toEqual({
        OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: 'p1' } }],
      });
    });

    it('degrades to a single-column predicate for a legacy ISO cursor', () => {
      const where = compositeCursorWhere('2026-05-17T00:00:00.000Z');
      expect(where).toEqual({ createdAt: { lt: new Date('2026-05-17T00:00:00.000Z') } });
    });

    it('treats a malformed cursor as absent (no SQL injection of garbage)', () => {
      expect(compositeCursorWhere('totally-garbage')).toEqual({});
    });
  });

  describe('nextCursorFromPage', () => {
    it('returns null when the page is shorter than the limit', () => {
      expect(nextCursorFromPage([], 10)).toBeNull();
      expect(nextCursorFromPage([{ createdAt: new Date(), id: 'x' }], 10)).toBeNull();
    });

    it('encodes the trailing row when the page is full', () => {
      const at = new Date('2026-05-17T00:00:00.000Z');
      const items = [
        { createdAt: new Date('2026-05-17T00:00:02.000Z'), id: 'a' },
        { createdAt: new Date('2026-05-17T00:00:01.000Z'), id: 'b' },
        { createdAt: at, id: 'c' },
      ];
      const cursor = nextCursorFromPage(items, 3);
      expect(cursor).not.toBeNull();
      const decoded = decodeCursor(cursor as string);
      expect(decoded.createdAt.toISOString()).toBe(at.toISOString());
      expect(decoded.id).toBe('c');
    });
  });
});
