/**
 * List courses tied to a given institution code.
 */

import type { Course } from '../../../schemas/mec.schema';
import { CourseQueryService } from '../../services/course-query.service';

export class ListCoursesByInstitutionUseCase {
  constructor(private readonly courseQuery: CourseQueryService) {}

  execute(codigoIes: number): Promise<Course[]> {
    return this.courseQuery.listCoursesByInstitutionCode(codigoIes);
  }
}
