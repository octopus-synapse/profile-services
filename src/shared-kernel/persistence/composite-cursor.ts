/**
 * Composite (createdAt, id) cursor encoding (P1 #35).
 *
 * Single-column timestamp cursors (`createdAt < cursor`) are
 * deterministic only when timestamps are unique. Feed / timeline rows
 * routinely share createdAt values (bulk import, programmatic backfill,
 * a single tick of a high-throughput producer). With ties present:
 *
 *   - skipping forward strictly (`<`) can drop rows whose createdAt
 *     equals the cursor — silent data loss in the user-visible feed.
 *   - including the boundary (`<=`) can return the same row in two
 *     successive pages — visible duplicates.
 *
 * The fix is a composite tiebreaker on `id`. We encode `(createdAt, id)`
 * and the SQL predicate becomes
 *
 *   createdAt < c.createdAt
 *   OR (createdAt = c.createdAt AND id < c.id)
 *
 * which gives strict, deterministic pagination regardless of ties.
 *
 * Encoding is `base64url(JSON.stringify({c, i}))` so the wire format
 * is opaque to clients (they pass it back unchanged) and tolerant of
 * URL query-string transport.
 */

export interface CompositeCursor {
  readonly createdAt: Date;
  readonly id: string;
}

interface SerializedCursor {
  readonly c: string;
  readonly i: string;
}

function toBase64Url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function fromBase64Url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

export function encodeCursor(createdAt: Date, id: string): string {
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    throw new TypeError('encodeCursor: createdAt must be a valid Date');
  }
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('encodeCursor: id must be a non-empty string');
  }
  const payload: SerializedCursor = { c: createdAt.toISOString(), i: id };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeCursor(raw: string): CompositeCursor {
  let payload: unknown;
  try {
    payload = JSON.parse(fromBase64Url(raw));
  } catch (err) {
    throw new TypeError(
      `decodeCursor: cursor is not valid base64url JSON: ${err instanceof Error ? err.message : 'unknown'}`,
    );
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as SerializedCursor).c !== 'string' ||
    typeof (payload as SerializedCursor).i !== 'string'
  ) {
    throw new TypeError('decodeCursor: cursor payload missing {c, i}');
  }
  const { c, i } = payload as SerializedCursor;
  const createdAt = new Date(c);
  if (Number.isNaN(createdAt.getTime())) {
    throw new TypeError(`decodeCursor: createdAt is not a valid ISO datetime: ${c}`);
  }
  if (i.length === 0) {
    throw new TypeError('decodeCursor: id must be non-empty');
  }
  return { createdAt, id: i };
}

/**
 * Tries to decode the cursor and returns `null` when it's absent or
 * malformed. Callers that want to surface decode errors should use
 * `decodeCursor` directly.
 */
export function tryDecodeCursor(raw: string | null | undefined): CompositeCursor | null {
  if (!raw) return null;
  try {
    return decodeCursor(raw);
  } catch {
    return null;
  }
}
