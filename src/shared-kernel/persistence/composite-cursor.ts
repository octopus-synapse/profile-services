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

/**
 * Build a Prisma-style `where` fragment expressing the composite
 * `(createdAt, id)` strict-less-than predicate for any model that has
 * those two columns. Returns `{}` when `cursor` is undefined / null so
 * callers can spread the result unconditionally:
 *
 *   where: { userId, ...compositeCursorWhere(cursor) }
 *
 * Legacy callers that still pass a plain ISO timestamp degrade
 * gracefully to the single-column predicate (no tiebreaker, but no
 * 400 either) so SDK regens can roll out independently from server
 * deploys.
 *
 * Lifted from `prisma-feed.repository.ts` (P1 #35 — Wave 1.3 first
 * adopter) so the remaining cursor-paginated read paths
 * (`listBookmarks`, `PrismaCommentRepository`, `PrismaEngagementRepository`)
 * can share the same implementation.
 */
export type CompositeCursorWhere =
  | Record<string, never>
  | { createdAt: { lt: Date } }
  | {
      OR: Array<{ createdAt: { lt: Date } } | { createdAt: Date; id: { lt: string } }>;
    };

export function compositeCursorWhere(cursor: string | undefined | null): CompositeCursorWhere {
  if (!cursor) return {};
  const decoded = tryDecodeCursor(cursor);
  if (decoded) {
    return {
      OR: [
        { createdAt: { lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, id: { lt: decoded.id } },
      ],
    };
  }
  const legacy = new Date(cursor);
  if (Number.isNaN(legacy.getTime())) return {};
  return { createdAt: { lt: legacy } };
}

/** Encode the trailing row of a page into a cursor; returns `null`
 *  when the page is incomplete (signals end-of-list to the client). */
export function nextCursorFromPage<T extends { readonly createdAt: Date; readonly id: string }>(
  items: ReadonlyArray<T>,
  limit: number,
): string | null {
  if (items.length < limit) return null;
  const last = items[items.length - 1];
  if (!last) return null;
  return encodeCursor(last.createdAt, last.id);
}
