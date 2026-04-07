/**
 * Section Type Definition Port
 *
 * Abstracts the query for section type definitions (Prisma).
 */

import type { SectionTypeData } from '../config/onboarding-steps.config';

export abstract class SectionTypeDefinitionPort {
  abstract findAll(locale?: string): Promise<SectionTypeData[]>;
}
