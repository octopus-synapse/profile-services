/**
 * Catalog adapter for `SectionTypesCatalogPort`. Wraps the resumes-side
 * `SectionTypeRepository` cache and projects each entry into the public
 * `{key, semanticKind, title}` triple the SDK consumes.
 */

import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import type { SectionTypeView } from '../../../domain/entities/section-type-view';
import { SectionTypesCatalogPort } from '../../../domain/ports/section-types.catalog.port';

export class SectionTypesCatalogAdapter extends SectionTypesCatalogPort {
  constructor(private readonly sectionTypeRepository: SectionTypeRepository) {
    super();
  }

  listAll(): SectionTypeView[] {
    const out: SectionTypeView[] = [];
    for (const st of this.sectionTypeRepository.getAll()) {
      out.push({
        key: st.key,
        semanticKind: st.semanticKind ?? '',
        title: st.title,
      });
    }
    return out;
  }
}
