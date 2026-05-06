/**
 * Resume Query Includes
 *
 * Prisma include configurations for fetching resume with generic sections.
 *
 * P2-115 — `RESUME_PUBLIC_VISIBLE_INCLUDE` already enforces a per-
 * section item cap and the public-visibility filter; the DSL needed
 * the same shape, so this file now re-exports the canonical
 * projection instead of keeping a parallel literal that drifted on
 * every change.
 */
export { RESUME_PUBLIC_VISIBLE_INCLUDE as RESUME_RELATIONS_INCLUDE } from '@/shared-kernel/persistence/resume-projections';
