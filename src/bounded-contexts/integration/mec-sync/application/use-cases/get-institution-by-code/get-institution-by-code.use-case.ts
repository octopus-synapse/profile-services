/**
 * Look up a single MEC institution (with embedded courses) by
 * `codigoIes`.
 */

import type { InstitutionWithCourses } from '../../../schemas/mec.schema';
import { InstitutionQueryService } from '../../services/institution-query.service';

export class GetInstitutionByCodeUseCase {
  constructor(private readonly institutionQuery: InstitutionQueryService) {}

  execute(codigoIes: number): Promise<InstitutionWithCourses | null> {
    return this.institutionQuery.findInstitutionByCodeWithCourses(codigoIes);
  }
}
