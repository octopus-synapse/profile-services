import { Prisma } from '@prisma/client';

export const NOT_DELETED = { isDeleted: false } as const;

export function active<T extends Record<string, unknown>>(where?: T): T & { isDeleted: false } {
  return { ...(where ?? ({} as T)), isDeleted: false };
}

/**
 * Models with an `isDeleted` boolean column, kept in sync with
 * `prisma/schema/*.prisma`. Audit (Q49 in the duplication audit):
 *
 *   - Message, Post, PostComment — soft-delete required for moderation
 *     + author-erasure GDPR flows.
 *
 * Other domain entities (Resume, Job, User, etc.) were intentionally
 * NOT migrated to soft-delete because the GDPR contract for those
 * models requires hard erasure. Document any future addition here so
 * the extension's findMany / findFirst / count / update guards apply.
 */
const SOFT_DELETE_MODELS = new Set(['Message', 'Post', 'PostComment']);

export const softDeleteExtension = Prisma.defineExtension({
  name: 'soft-delete-filter',
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          const where = (args.where ?? {}) as Record<string, unknown>;
          if (where.isDeleted === undefined) {
            args.where = { ...where, isDeleted: false };
          }
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          const where = (args.where ?? {}) as Record<string, unknown>;
          if (where.isDeleted === undefined) {
            args.where = { ...where, isDeleted: false };
          }
        }
        return query(args);
      },
      async count({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          const where = (args.where ?? {}) as Record<string, unknown>;
          if (where.isDeleted === undefined) {
            args.where = { ...where, isDeleted: false };
          }
        }
        return query(args);
      },
      async updateMany({ model, args, query }) {
        // Updates that don't filter on isDeleted should not silently
        // mutate already-deleted rows. Q49 in the duplication audit.
        if (SOFT_DELETE_MODELS.has(model)) {
          const where = (args.where ?? {}) as Record<string, unknown>;
          if (where.isDeleted === undefined) {
            args.where = { ...where, isDeleted: false };
          }
        }
        return query(args);
      },
    },
  },
});
