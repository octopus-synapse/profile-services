import { Prisma } from '@prisma/client';

export const NOT_DELETED = { isDeleted: false } as const;

export function active<T extends Record<string, unknown>>(where?: T): T & { isDeleted: false } {
  return { ...(where ?? ({} as T)), isDeleted: false };
}

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
    },
  },
});
