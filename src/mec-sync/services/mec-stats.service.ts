/**
 * MEC Stats Service
 * Single Responsibility: Statistics and aggregations
 */

import { Injectable } from '@nestjs/common';
import { InstitutionRepository, CourseRepository } from '../repositories';
import { MecStatsDto } from '../dto';

@Injectable()
export class MecStatsService {
  constructor(
    private readonly institutionRepo: InstitutionRepository,
    private readonly courseRepo: CourseRepository,
  ) {}

  async getStats(): Promise<MecStatsDto> {
    const [totalInstitutions, totalCourses, coursesByDegree, institutionsByUf] =
      await Promise.all([
        this.institutionRepo.count(),
        this.courseRepo.count(),
        this.courseRepo.countByDegree(),
        this.institutionRepo.countByUf(),
      ]);

    return {
      totalInstitutions,
      totalCourses,
      coursesByGrau: coursesByDegree.map((g) => ({
        grau: g.grau || 'Não informado',
        count: g._count,
      })),
      institutionsByUf: institutionsByUf.map((u) => ({
        uf: u.uf,
        count: u._count,
      })),
    };
  }
}
