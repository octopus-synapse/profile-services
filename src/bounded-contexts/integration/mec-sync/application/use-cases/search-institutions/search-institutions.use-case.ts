/**
 * Search institutions — ranked across nome / sigla / municipio / uf /
 * organizacao (see domain/services/institution-search-ranking.ts).
 */

import type { Institution } from '../../../schemas/mec.schema';
import { InstitutionQueryService } from '../../services/institution-query.service';

export class SearchInstitutionsUseCase {
  constructor(private readonly institutionQuery: InstitutionQueryService) {}

  execute(query: string, limit: number): Promise<Institution[]> {
    return this.institutionQuery.searchInstitutions(query, limit);
  }
}
