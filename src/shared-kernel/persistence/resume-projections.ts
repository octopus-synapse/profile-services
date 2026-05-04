/**
 * Canonical Prisma `include` shapes for the `Resume` model.
 *
 * Two shapes were drifting between resumes/core/resumes.repository.ts
 * and dsl/infrastructure/queries/resume-query.ts — see Q45 in the
 * duplication audit. The owner-facing variant returns every section;
 * the public-facing variant filters by `isVisible: true`.
 */

/**
 * Owner / admin variant — returns ALL sections regardless of
 * visibility. Use in routes that authenticate the resume owner.
 */
export const RESUME_FULL_INCLUDE = {
  resumeSections: {
    orderBy: { order: 'asc' as const },
    include: {
      sectionType: true,
      items: {
        orderBy: { order: 'asc' as const },
      },
    },
  },
  style: {
    select: { id: true, name: true, description: true },
  },
} as const;

/**
 * Public variant — only sections and items with `isVisible: true`.
 * Use in unauthenticated read paths (public profile, share links).
 *
 * Mirrors the `RESUME_RELATIONS_INCLUDE` shape that lived in DSL.
 */
export const RESUME_PUBLIC_VISIBLE_INCLUDE = {
  style: true,
  resumeSections: {
    where: { isVisible: true },
    orderBy: { order: 'asc' as const },
    include: {
      sectionType: {
        select: { key: true, title: true, semanticKind: true, translations: true },
      },
      items: {
        where: { isVisible: true },
        orderBy: { order: 'asc' as const },
        select: {
          id: true,
          order: true,
          isVisible: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
} as const;
