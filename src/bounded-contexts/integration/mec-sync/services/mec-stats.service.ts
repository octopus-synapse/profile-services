/**
 * MEC Stats Service
 * Single Responsibility: Statistics and aggregations
 */

import { Injectable } from '@nestjs/common';
import { MecStats } from '@/shared-kernel';
import { CourseRepository, InstitutionRepository } from '../repositories';

@Injectable()
export class MecStatsService {
  constructor(
    private readonly institutionRepo: InstitutionRepository,
    private readonly courseRepo: CourseRepository,
  ) {}

  async getMecStatistics(): Promise<MecStats> {
    const totalInstitutionCount = await this.institutionRepo.countActiveInstitutions();
    const totalCourseCount: number = await this.courseRepo.countActiveCourses();
    const coursesByDegreeCount: Array<{
      grau: string | null;
      _count: number;
    }> = await this.courseRepo.countCoursesByDegree();
    const institutionsByUfCount: Array<{
      uf: string;
      _count: number;
    }> = await this.institutionRepo.countInstitutionsByUf();

    const coursesByGrauStatistics = coursesByDegreeCount.map((degreeGroup) => ({
      grau: degreeGroup.grau ?? 'Não informado',
      count: degreeGroup._count,
    }));

    const institutionsByUfStatistics = institutionsByUfCount.map((ufGroup) => ({
      uf: ufGroup.uf,
      count: ufGroup._count,
    }));

    return {
      totalInstitutions: totalInstitutionCount,
      totalCourses: totalCourseCount,
      coursesByGrau: coursesByGrauStatistics,
      institutionsByUf: institutionsByUfStatistics,
    };
  }
}
