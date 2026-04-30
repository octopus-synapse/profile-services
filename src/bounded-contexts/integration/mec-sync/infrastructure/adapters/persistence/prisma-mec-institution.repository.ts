/**
 * Prisma adapter for `MecInstitutionRepositoryPort`. Owns the raw SQL
 * search (Postgres `immutable_unaccent` extension) and the bulk-insert
 * batching (`BATCH_SIZE` rows per `createMany`).
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { BATCH_SIZE } from '../../../constants';
import type { NormalizedInstitution } from '../../../domain/entities/mec-row';
import {
  type InstitutionWithCoursesRow,
  MecInstitutionRepositoryPort,
} from '../../../domain/ports/mec-institution.repository.port';
import type { Institution } from '../../../schemas/mec.schema';

const INSTITUTION_SELECT = {
  id: true,
  codigoIes: true,
  nome: true,
  sigla: true,
  uf: true,
  municipio: true,
  categoria: true,
  organizacao: true,
} as const;

export class PrismaMecInstitutionRepository extends MecInstitutionRepositoryPort {
  private readonly context = 'PrismaMecInstitutionRepository';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findAllActiveInstitutions(): Promise<Institution[]> {
    return this.prisma.mecInstitution.findMany({
      where: { isActive: true },
      orderBy: [{ uf: 'asc' }, { nome: 'asc' }],
      select: INSTITUTION_SELECT,
    });
  }

  async findInstitutionsByUf(uf: string): Promise<Institution[]> {
    return this.prisma.mecInstitution.findMany({
      where: { uf: uf.toUpperCase(), isActive: true },
      orderBy: { nome: 'asc' },
      select: INSTITUTION_SELECT,
    });
  }

  async findInstitutionByCode(codigoIes: number): Promise<InstitutionWithCoursesRow | null> {
    const row = await this.prisma.mecInstitution.findUnique({
      where: { codigoIes },
      include: {
        courses: {
          where: { isActive: true },
          orderBy: { nome: 'asc' },
          select: {
            id: true,
            codigoCurso: true,
            nome: true,
            grau: true,
            modalidade: true,
            areaConhecimento: true,
          },
        },
      },
    });
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
    return this.prisma.$queryRaw<Institution[]>`
      SELECT
        id, "codigoIes", nome, sigla, uf, municipio, categoria, organizacao
      FROM "MecInstitution"
      WHERE "isActive" = true
        AND (
          immutable_unaccent(lower(nome)) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
          OR (sigla IS NOT NULL AND immutable_unaccent(lower(sigla)) LIKE '%' || immutable_unaccent(lower(${query})) || '%')
        )
      ORDER BY uf ASC, nome ASC
      LIMIT ${limit}
    `;
  }

  async findAllDistinctUfs(): Promise<string[]> {
    const ufs = await this.prisma.mecInstitution.findMany({
      where: { isActive: true },
      select: { uf: true },
      distinct: ['uf'],
      orderBy: { uf: 'asc' },
    });
    return ufs.map((u) => u.uf);
  }

  async countInstitutionsByUf(): Promise<Array<{ uf: string; _count: number }>> {
    const result = await this.prisma.mecInstitution.groupBy({
      by: ['uf'],
      where: { isActive: true },
      _count: { _all: true },
      orderBy: { uf: 'asc' },
    });
    return result.map((r) => ({ uf: r.uf, _count: r._count._all }));
  }

  async countActiveInstitutions(): Promise<number> {
    return this.prisma.mecInstitution.count({ where: { isActive: true } });
  }

  async findAllExistingInstitutionCodes(): Promise<Set<number>> {
    const existing = await this.prisma.mecInstitution.findMany({
      select: { codigoIes: true },
    });
    return new Set(existing.map((i) => i.codigoIes));
  }

  async bulkCreateInstitutions(rows: NormalizedInstitution[]): Promise<number> {
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await this.prisma.mecInstitution.createMany({
        data: batch.map((institution) => ({
          codigoIes: institution.codigoIes,
          nome: institution.nome,
          sigla: institution.sigla,
          organizacao: institution.organizacao,
          categoria: institution.categoria,
          uf: institution.uf,
          municipio: institution.municipio,
          codigoMunicipio: institution.codigoMunicipio,
        })),
        skipDuplicates: true,
      });
      inserted += batch.length;
    }

    this.logger.debug(`Inserted ${inserted} institutions`, this.context);
    return inserted;
  }
}
