/**
 * Prisma adapter for `MecCourseRepositoryPort`. Owns the unaccent
 * search SQL, the bulk insert, and the institution-code-aware filter
 * that prevents orphan courses from being persisted.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { BATCH_SIZE } from '../../../constants';
import type { NormalizedCourse } from '../../../domain/entities/mec-row';
import { MecCourseRepositoryPort } from '../../../domain/ports/mec-course.repository.port';
import type { Course } from '../../../schemas/mec.schema';

export class PrismaMecCourseRepository extends MecCourseRepositoryPort {
  private readonly context = 'PrismaMecCourseRepository';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findCoursesByInstitutionCode(codigoIes: number): Promise<Course[]> {
    const courses = await this.prisma.mecCourse.findMany({
      where: { codigoIes, isActive: true },
      orderBy: { nome: 'asc' },
      include: {
        institution: { select: { nome: true, sigla: true, uf: true } },
      },
    });
    return courses.map((c) => this.mapTo(c));
  }

  async findCourseByCode(codigoCurso: number): Promise<Course | null> {
    const course = await this.prisma.mecCourse.findUnique({
      where: { codigoCurso },
      include: { institution: { select: { nome: true, sigla: true, uf: true } } },
    });
    return course ? this.mapTo(course) : null;
  }

  async searchCoursesByName(query: string, limit: number): Promise<Course[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        codigoCurso: number;
        nome: string;
        grau: string | null;
        modalidade: string | null;
        areaConhecimento: string | null;
        institution_nome: string;
        institution_sigla: string | null;
        institution_uf: string;
      }>
    >`
      SELECT
        c.id, c."codigoCurso", c.nome, c.grau, c.modalidade, c."areaConhecimento",
        i.nome as institution_nome, i.sigla as institution_sigla, i.uf as institution_uf
      FROM "MecCourse" c
      JOIN "MecInstitution" i ON c."codigoIes" = i."codigoIes"
      WHERE c."isActive" = true
        AND immutable_unaccent(lower(c.nome)) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
      ORDER BY c.nome ASC
      LIMIT ${limit}
    `;

    return rows.map((c) => ({
      id: c.id,
      codigoCurso: c.codigoCurso,
      nome: c.nome,
      grau: c.grau,
      modalidade: c.modalidade,
      areaConhecimento: c.areaConhecimento,
      institution: { nome: c.institution_nome, sigla: c.institution_sigla, uf: c.institution_uf },
    }));
  }

  async findAllDistinctKnowledgeAreas(): Promise<string[]> {
    const areas = await this.prisma.mecCourse.findMany({
      where: { isActive: true, areaConhecimento: { not: null } },
      select: { areaConhecimento: true },
      distinct: ['areaConhecimento'],
      orderBy: { areaConhecimento: 'asc' },
    });

    return areas.map((a) => a.areaConhecimento).filter((a): a is string => a !== null);
  }

  async countCoursesByDegree(): Promise<Array<{ grau: string | null; _count: number }>> {
    const result = await this.prisma.mecCourse.groupBy({
      by: ['grau'],
      where: { isActive: true },
      _count: { _all: true },
    });
    return result.map((r) => ({ grau: r.grau, _count: r._count._all }));
  }

  async countActiveCourses(): Promise<number> {
    return this.prisma.mecCourse.count({ where: { isActive: true } });
  }

  async findAllExistingCourseCodes(): Promise<Set<number>> {
    const existing = await this.prisma.mecCourse.findMany({ select: { codigoCurso: true } });
    return new Set(existing.map((c) => c.codigoCurso));
  }

  async bulkCreateCourses(
    rows: NormalizedCourse[],
    validInstitutionCodes: Set<number>,
  ): Promise<number> {
    const valid = rows.filter((c) => validInstitutionCodes.has(c.codigoIes));
    let inserted = 0;

    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      const batch = valid.slice(i, i + BATCH_SIZE);
      await this.prisma.mecCourse.createMany({
        data: batch.map((course) => ({
          codigoCurso: course.codigoCurso,
          codigoIes: course.codigoIes,
          nome: course.nome,
          grau: course.grau,
          modalidade: course.modalidade,
          areaConhecimento: course.areaConhecimento,
          cargaHoraria: course.cargaHoraria,
          situacao: course.situacao,
        })),
        skipDuplicates: true,
      });
      inserted += batch.length;
    }

    this.logger.debug(`Inserted ${inserted} courses`, this.context);
    return inserted;
  }

  private mapTo(course: {
    id: string;
    codigoCurso: number;
    nome: string;
    grau: string | null;
    modalidade: string | null;
    areaConhecimento: string | null;
    institution: { nome: string; sigla: string | null; uf: string };
  }): Course {
    return {
      id: course.id,
      codigoCurso: course.codigoCurso,
      nome: course.nome,
      grau: course.grau,
      modalidade: course.modalidade,
      areaConhecimento: course.areaConhecimento,
      institution: course.institution,
    };
  }
}
