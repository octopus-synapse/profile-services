/**
 * In-memory adapters for the institution + course repository ports.
 * Faithful enough for the use case + service specs:
 *   - bulk inserts skip duplicates
 *   - search is a simple substring match (no Postgres unaccent magic)
 *   - tests can `seedInstitution` / `seedCourse` to set up state
 */

import type { NormalizedCourse, NormalizedInstitution } from '../domain/entities/mec-row';
import { MecCourseRepositoryPort } from '../domain/ports/mec-course.repository.port';
import {
  type InstitutionWithCoursesRow,
  MecInstitutionRepositoryPort,
} from '../domain/ports/mec-institution.repository.port';
import type { Course, CourseBasic, Institution } from '../schemas/mec.schema';

interface InstitutionRow extends Institution {
  isActive: boolean;
  codigoMunicipio: number | null;
  courses: CourseBasic[];
}

interface CourseRow extends Course {
  codigoIes: number;
  isActive: boolean;
  cargaHoraria: number | null;
  situacao: string | null;
}

export class InMemoryMecInstitutionRepository extends MecInstitutionRepositoryPort {
  readonly institutions = new Map<number, InstitutionRow>();

  seedInstitution(row: Partial<InstitutionRow> & { codigoIes: number; nome: string }): void {
    this.institutions.set(row.codigoIes, {
      id: row.id ?? `i-${row.codigoIes}`,
      codigoIes: row.codigoIes,
      nome: row.nome,
      sigla: row.sigla ?? null,
      uf: row.uf ?? 'SP',
      municipio: row.municipio ?? null,
      categoria: row.categoria ?? null,
      organizacao: row.organizacao ?? null,
      codigoMunicipio: row.codigoMunicipio ?? null,
      isActive: row.isActive ?? true,
      courses: row.courses ?? [],
    });
  }

  async listActiveInstitutions(): Promise<Institution[]> {
    return [...this.institutions.values()].filter((i) => i.isActive).map(this.toInstitution);
  }

  async findInstitutionsByUf(uf: string): Promise<Institution[]> {
    return [...this.institutions.values()]
      .filter((i) => i.isActive && i.uf === uf.toUpperCase())
      .map(this.toInstitution);
  }

  async findInstitutionByCode(codigoIes: number): Promise<InstitutionWithCoursesRow | null> {
    const row = this.institutions.get(codigoIes);
    if (!row) return null;
    return {
      id: row.id,
      codigoIes: row.codigoIes,
      nome: row.nome,
      sigla: row.sigla,
      uf: row.uf,
      municipio: row.municipio,
      categoria: row.categoria,
      organizacao: row.organizacao,
      courses: row.courses,
    };
  }

  async searchInstitutionsByName(query: string, limit: number): Promise<Institution[]> {
    const lower = query.toLowerCase();
    return [...this.institutions.values()]
      .filter((i) => i.isActive && i.nome.toLowerCase().includes(lower))
      .slice(0, limit)
      .map(this.toInstitution);
  }

  async listDistinctUfs(): Promise<string[]> {
    return [...new Set([...this.institutions.values()].filter((i) => i.isActive).map((i) => i.uf))];
  }

  async countInstitutionsByUf(): Promise<Array<{ uf: string; _count: number }>> {
    const counts = new Map<string, number>();
    for (const i of this.institutions.values()) {
      if (!i.isActive) continue;
      counts.set(i.uf, (counts.get(i.uf) ?? 0) + 1);
    }
    return [...counts.entries()].map(([uf, _count]) => ({ uf, _count }));
  }

  async countActiveInstitutions(): Promise<number> {
    return [...this.institutions.values()].filter((i) => i.isActive).length;
  }

  async listExistingInstitutionCodes(): Promise<Set<number>> {
    return new Set([...this.institutions.keys()]);
  }

  async bulkCreateInstitutions(rows: NormalizedInstitution[]): Promise<number> {
    let inserted = 0;
    for (const row of rows) {
      if (this.institutions.has(row.codigoIes)) continue;
      this.seedInstitution({
        codigoIes: row.codigoIes,
        nome: row.nome,
        sigla: row.sigla,
        uf: row.uf,
        municipio: row.municipio,
        categoria: row.categoria,
        organizacao: row.organizacao,
        codigoMunicipio: row.codigoMunicipio,
      });
      inserted += 1;
    }
    return inserted;
  }

  private toInstitution = (row: InstitutionRow): Institution => ({
    id: row.id,
    codigoIes: row.codigoIes,
    nome: row.nome,
    sigla: row.sigla,
    uf: row.uf,
    municipio: row.municipio,
    categoria: row.categoria,
    organizacao: row.organizacao,
  });
}

export class InMemoryMecCourseRepository extends MecCourseRepositoryPort {
  readonly courses = new Map<number, CourseRow>();
  findCoursesByInstitutionCodeCalls = 0;

  seedCourse(
    row: Partial<CourseRow> & { codigoCurso: number; codigoIes: number; nome: string; uf?: string },
  ): void {
    this.courses.set(row.codigoCurso, {
      id: row.id ?? `c-${row.codigoCurso}`,
      codigoCurso: row.codigoCurso,
      codigoIes: row.codigoIes,
      nome: row.nome,
      grau: row.grau ?? null,
      modalidade: row.modalidade ?? null,
      areaConhecimento: row.areaConhecimento ?? null,
      institution: row.institution ?? { nome: 'X', sigla: null, uf: row.uf ?? 'SP' },
      cargaHoraria: row.cargaHoraria ?? null,
      situacao: row.situacao ?? null,
      isActive: row.isActive ?? true,
    });
  }

  async findCoursesByInstitutionCode(codigoIes: number): Promise<Course[]> {
    this.findCoursesByInstitutionCodeCalls += 1;
    return [...this.courses.values()]
      .filter((c) => c.isActive && c.codigoIes === codigoIes)
      .map(this.toCourse);
  }

  async findCourseByCode(codigoCurso: number): Promise<Course | null> {
    const row = this.courses.get(codigoCurso);
    return row ? this.toCourse(row) : null;
  }

  async searchCoursesByName(query: string, limit: number): Promise<Course[]> {
    const lower = query.toLowerCase();
    return [...this.courses.values()]
      .filter((c) => c.isActive && c.nome.toLowerCase().includes(lower))
      .slice(0, limit)
      .map(this.toCourse);
  }

  async listDistinctKnowledgeAreas(): Promise<string[]> {
    return [
      ...new Set(
        [...this.courses.values()]
          .filter((c) => c.isActive && c.areaConhecimento)
          .map((c) => c.areaConhecimento as string),
      ),
    ];
  }

  async countCoursesByDegree(): Promise<Array<{ grau: string | null; _count: number }>> {
    const counts = new Map<string | null, number>();
    for (const c of this.courses.values()) {
      if (!c.isActive) continue;
      counts.set(c.grau, (counts.get(c.grau) ?? 0) + 1);
    }
    return [...counts.entries()].map(([grau, _count]) => ({ grau, _count }));
  }

  async countActiveCourses(): Promise<number> {
    return [...this.courses.values()].filter((c) => c.isActive).length;
  }

  async listExistingCourseCodes(): Promise<Set<number>> {
    return new Set([...this.courses.keys()]);
  }

  async bulkCreateCourses(
    rows: NormalizedCourse[],
    validInstitutionCodes: Set<number>,
  ): Promise<number> {
    let inserted = 0;
    for (const row of rows) {
      if (this.courses.has(row.codigoCurso)) continue;
      if (!validInstitutionCodes.has(row.codigoIes)) continue;
      this.seedCourse({
        codigoCurso: row.codigoCurso,
        codigoIes: row.codigoIes,
        nome: row.nome,
        grau: row.grau,
        modalidade: row.modalidade,
        areaConhecimento: row.areaConhecimento,
        cargaHoraria: row.cargaHoraria,
        situacao: row.situacao,
      });
      inserted += 1;
    }
    return inserted;
  }

  private toCourse = (row: CourseRow): Course => ({
    id: row.id,
    codigoCurso: row.codigoCurso,
    nome: row.nome,
    grau: row.grau,
    modalidade: row.modalidade,
    areaConhecimento: row.areaConhecimento,
    institution: row.institution,
  });
}
