/**
 * Pure-TS wiring for the presentation BC. Zero `@nestjs/*` imports.
 *
 * The presentation BC currently ships a single sub-area
 * (`public-resumes`); this file re-exports its composition so the
 * Elysia bootstrap can mount the BC behind a single import. The Nest
 * shell (`presentation.module.ts`) imports `PublicResumesModule`
 * directly to preserve the existing module tree.
 */

export {
  buildPublicResumesComposition,
  buildPublicResumesUseCases,
  type PublicResumesCompositionDeps,
  PublicResumesHttpBundle,
} from './public-resumes/public-resumes.composition';
