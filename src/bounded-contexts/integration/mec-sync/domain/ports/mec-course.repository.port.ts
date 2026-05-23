/**
 * Outbound port for MEC course persistence. Read-side queries for the
 * public API and the bulk-insert / existing-codes pair the sync pipeline
 * uses.
 */

import type { Course } from '../../schemas/mec.schema';
import type { NormalizedCourse } from '../entities/mec-row';

export abstract class MecCourseRepositoryPort {
  abstract findCoursesByInstitutionCode(codigoIes: number): Promise<Course[]>;
  abstract findCourseByCode(codigoCurso: number): Promise<Course | null>;
  abstract searchCoursesByName(query: string, limit: number): Promise<Course[]>;
  abstract listDistinctKnowledgeAreas(): Promise<string[]>;
  abstract countCoursesByDegree(): Promise<Array<{ grau: string | null; _count: number }>>;
  abstract countActiveCourses(): Promise<number>;
  abstract listExistingCourseCodes(): Promise<Set<number>>;
  abstract bulkCreateCourses(
    rows: NormalizedCourse[],
    validInstitutionCodes: Set<number>,
  ): Promise<number>;
}
