/**
 * Section Ordering Adapter
 *
 * Adapts SectionTypeRepository to the SectionOrderingPort.
 */

import type { SectionTypeRepository } from '@/bounded-contexts/resumes/shared-kernel/infrastructure/repositories';
import type { SectionOrderingPort } from '../../../domain/ports/section-ordering.port';

export class SectionOrderingAdapter implements SectionOrderingPort {
  constructor(private readonly sectionTypeRepo: SectionTypeRepository) {}

  getRecommendedPosition(sectionTypeKey: string): number {
    const sectionType = this.sectionTypeRepo.getByKey(sectionTypeKey);
    return sectionType?.definition.ats?.recommendedPosition ?? 99;
  }
}
