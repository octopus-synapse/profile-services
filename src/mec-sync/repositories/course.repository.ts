/**
 * Course Repository
 * Single Responsibility: Data access for MEC courses
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseDto } from '../dto';
import { NormalizedCourse } from '../interfaces/mec-data.interface';
import { BATCH_SIZE } from '../constants';

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByInstitution(codigoIes: number): Promise<CourseDto[]> {
    const courses = await this.prisma.mecCourse.findMany({
      where: { codigoIes, isActive: true },
      orderBy: { nome: 'asc' },
      include: {
        institution: {
          select: { nome: true, sigla: true, uf: true },
        },
      },
    });

    return courses.map((course) => this.mapToDto(course));
  }

  async findByCode(codigoCurso: number): Promise<CourseDto | null> {
    const course = await this.prisma.mecCourse.findUnique({
      where: { codigoCurso },
      include: {
        institution: {
          select: { nome: true, sigla: true, uf: true },
        },
      },
    });

    return course ? this.mapToDto(course) : null;
  }

  async search(query: string, limit: number): Promise<CourseDto[]> {
    const courses = await this.prisma.$queryRaw<
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

    return courses.map((c) => ({
      id: c.id,
      codigoCurso: c.codigoCurso,
      nome: c.nome,
      grau: c.grau,
      modalidade: c.modalidade,
      areaConhecimento: c.areaConhecimento,
      institution: {
        nome: c.institution_nome,
        sigla: c.institution_sigla,
        uf: c.institution_uf,
      },
    }));
  }

  async getDistinctAreas(): Promise<string[]> {
    const areas = await this.prisma.mecCourse.findMany({
      where: { isActive: true, areaConhecimento: { not: null } },
      select: { areaConhecimento: true },
      distinct: ['areaConhecimento'],
      orderBy: { areaConhecimento: 'asc' },
    });

    return areas
      .map((a) => a.areaConhecimento)
      .filter((a): a is string => a !== null);
  }

  async countByDegree() {
    return this.prisma.mecCourse.groupBy({
      by: ['grau'],
      where: { isActive: true },
      _count: true,
    });
  }

  async count(): Promise<number> {
    return this.prisma.mecCourse.count({ where: { isActive: true } });
  }

  async getExistingCodes(): Promise<Set<number>> {
    const existing = await this.prisma.mecCourse.findMany({
      select: { codigoCurso: true },
    });
    return new Set(existing.map((c) => c.codigoCurso));
  }

  async bulkCreate(
    courses: NormalizedCourse[],
    validIesCodes: Set<number>,
  ): Promise<number> {
    const validCourses = courses.filter((c) => validIesCodes.has(c.codigoIes));
    let inserted = 0;

    for (let i = 0; i < validCourses.length; i += BATCH_SIZE) {
      const batch = validCourses.slice(i, i + BATCH_SIZE);

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

    return inserted;
  }

  private mapToDto(course: {
    id: string;
    codigoCurso: number;
    nome: string;
    grau: string | null;
    modalidade: string | null;
    areaConhecimento: string | null;
    institution: { nome: string; sigla: string | null; uf: string };
  }): CourseDto {
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
