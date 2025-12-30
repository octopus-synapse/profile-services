/**
 * Stats DTOs
 * Single Responsibility: Data Transfer Objects for statistics
 */

export interface MecStatsDto {
  totalInstitutions: number;
  totalCourses: number;
  coursesByGrau: GrauCountDto[];
  institutionsByUf: UfCountDto[];
}

export interface GrauCountDto {
  grau: string;
  count: number;
}

export interface UfCountDto {
  uf: string;
  count: number;
}
