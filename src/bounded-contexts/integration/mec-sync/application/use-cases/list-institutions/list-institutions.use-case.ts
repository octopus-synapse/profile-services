/**
 * List active institutions, optionally filtered by state code.
 */

import type { Institution } from '../../../schemas/mec.schema';
import { InstitutionQueryService } from '../../services/institution-query.service';

export class ListInstitutionsUseCase {
  constructor(private readonly institutionQuery: InstitutionQueryService) {}

  execute(stateCode?: string): Promise<Institution[]> {
    return stateCode
      ? this.institutionQuery.listInstitutionsByState(stateCode)
      : this.institutionQuery.listAllActiveInstitutions();
  }
}
