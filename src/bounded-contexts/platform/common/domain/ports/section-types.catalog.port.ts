/**
 * Outbound port for the section-types catalog.
 *
 * The enums endpoint surfaces a flattened view; the catalog adapter
 * wraps the resumes-side `SectionTypeRepository` so the use case
 * stays a POJO without leaking Nest into the application layer.
 */

import type { SectionTypeView } from '../entities/section-type-view';

export abstract class SectionTypesCatalogPort {
  abstract listAll(): SectionTypeView[];
}
