/**
 * List the distinct state codes (UFs) covered by active institutions.
 */

import { InstitutionQueryService } from '../../services/institution-query.service';

export class ListStateCodesUseCase {
  constructor(private readonly institutionQuery: InstitutionQueryService) {}

  execute(): Promise<string[]> {
    return this.institutionQuery.findAllStateCodes();
  }
}
