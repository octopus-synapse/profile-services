/**
 * List the distinct knowledge areas covered by active courses.
 */

import { CourseQueryService } from '../../services/course-query.service';

export class ListKnowledgeAreasUseCase {
  constructor(private readonly courseQuery: CourseQueryService) {}

  execute(): Promise<string[]> {
    return this.courseQuery.listKnowledgeAreas();
  }
}
