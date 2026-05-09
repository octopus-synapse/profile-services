/**
 * Canonical Prisma `select` projections for the `User` model.
 *
 * Centralises the shapes that repositories were redefining locally
 * (`USER_SELECT`, `AUTHOR_SELECT`) — see Q6 in the duplication audit.
 *
 * Add new variants here when 2+ repositories need the same shape; keep
 * BC-specific projections local when the shape is genuinely unique.
 */

/**
 * Lightweight identity card: `id, name, username, photoURL`.
 *
 * Used by feed posts, follow/connection lists, comments — anywhere the
 * UI just renders a user chip without bio/role context.
 */
export const USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

/**
 * Summary plus bio and headline. Used by profile cards and search hits.
 */
export const USER_WITH_BIO_SELECT = {
  ...USER_SUMMARY_SELECT,
  bio: true,
  headline: true,
} as const;
