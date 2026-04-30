/**
 * MEC Stats Service — aggregates totals for the public stats endpoint.
 * Pure fan-out; counts come straight from the repository ports.
 */

import { LoggerPort } from '@/shared-kernel';
import { MecCourseRepositoryPort } from '../../domain/ports/mec-course.repository.port';
import { MecInstitutionRepositoryPort } from '../../domain/ports/mec-institution.repository.port';
import type { MecStats } from '../../schemas/mec.schema';

export class MecStatsService {
  constructor(
    private readonly logger: LoggerPort,
    private readonly institutionRepo: MecInstitutionRepositoryPort,
    private readonly courseRepo: MecCourseRepositoryPort,
  ) {}

  async getMecStatistics(): Promise<MecStats> {
    const totalInstitutions = await this.institutionRepo.countActiveInstitutions();
    const totalCourses = await this.courseRepo.countActiveCourses();
    const coursesByDegree = await this.courseRepo.countCoursesByDegree();
    const institutionsByUf = await this.institutionRepo.countInstitutionsByUf();

    this.logger.debug(
      `Stats: ${totalInstitutions} institutions, ${totalCourses} courses`,
      'MecStats',
    );

    return {
      totalInstitutions,
      totalCourses,
      coursesByGrau: coursesByDegree.map((g) => ({
        grau: g.grau ?? 'Não informado',
        count: g._count,
      })),
      institutionsByUf: institutionsByUf.map((u) => ({ uf: u.uf, count: u._count })),
    };
  }
}
