/**
 * Search institutions by name (substring match).
 */

import type { Institution } from '../../../schemas/mec.schema';
import { InstitutionQueryService } from '../../services/institution-query.service';

export class SearchInstitutionsUseCase {
  constructor(private readonly institutionQuery: InstitutionQueryService) {}

  execute(query: string, limit: number): Promise<Institution[]> {
    return this.institutionQuery.searchInstitutionsByName(query, limit);
  }
}
