/**
 * Lists the active section types as the flat `{key, semanticKind, title}`
 * triple consumed by the SDK. The catalog adapter wraps the resumes-side
 * `SectionTypeRepository` so we don't reach across BC boundaries.
 */

import type { SectionTypeView } from '../../../domain/entities/section-type-view';
import { SectionTypesCatalogPort } from '../../../domain/ports/section-types.catalog.port';

export class ListSectionTypesUseCase {
  constructor(private readonly catalog: SectionTypesCatalogPort) {}

  // eslint-disable-next-line @typescript-eslint/require-await -- async for parity with sibling enum use cases.
  async execute(): Promise<SectionTypeView[]> {
    return this.catalog.listAll();
  }
}
