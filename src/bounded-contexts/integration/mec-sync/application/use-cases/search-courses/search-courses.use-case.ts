/**
 * Search courses by name (substring match). Length-validation is done
 * at the controller boundary; this use case forwards to the cached
 * query service.
 */

import type { Course } from '../../../schemas/mec.schema';
import { CourseQueryService } from '../../services/course-query.service';

export class SearchCoursesUseCase {
  constructor(private readonly courseQuery: CourseQueryService) {}

  execute(query: string, limit: number): Promise<Course[]> {
    return this.courseQuery.searchCoursesByName(query, limit);
  }
}
