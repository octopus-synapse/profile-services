/**
 * Look up a single MEC course by its `codigoCurso`.
 */

import type { Course } from '../../../schemas/mec.schema';
import { CourseQueryService } from '../../services/course-query.service';

export class GetCourseByCodeUseCase {
  constructor(private readonly courseQuery: CourseQueryService) {}

  execute(codigoCurso: number): Promise<Course | null> {
    return this.courseQuery.findCourseByCode(codigoCurso);
  }
}
