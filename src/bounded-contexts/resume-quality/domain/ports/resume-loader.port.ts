import type { ResumeForCompleteness } from '../rules/completeness.rules';

/** Port for loading the minimal resume shape the quality engine needs.
 * Implemented in infrastructure/adapters/ with Prisma; the domain stays
 * ignorant of the persistence model. */
export abstract class ResumeLoaderPort {
  abstract load(resumeId: string): Promise<ResumeForCompleteness | null>;
}
