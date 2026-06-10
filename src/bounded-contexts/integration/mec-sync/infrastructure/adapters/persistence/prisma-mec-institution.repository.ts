/**
 * Prisma adapter for `MecInstitutionRepositoryPort`. Owns the raw SQL
 * search (Postgres `immutable_unaccent` extension) and the bulk-insert
 * batching (`BATCH_SIZE` rows per `createMany`).
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { Prisma } from '@prisma/client';
import { BATCH_SIZE } from '../../../constants';
import type { NormalizedInstitution } from '../../../domain/entities/mec-row';
import { INSTITUTION_SEARCH_TIERS } from '../../../domain/services/institution-search-ranking';
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

  async listActiveInstitutions(): Promise<Institution[]> {
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

  async searchInstitutions(tokens: string[], limit: number): Promise<Institution[]> {
    if (tokens.length === 0) return [];

    // One expression per token: the strongest tier it hits, as a GREATEST
    // over per-field CASEs. SQL mirror of `scoreInstitution` in
    // domain/services/institution-search-ranking.ts — keep in lockstep.
    const tokenScores = tokens.map((token) => {
      const exact = Prisma.sql`immutable_unaccent(lower(${token}))`;
      // LIKE patterns get %/_/\ escaped so a literal "100%" can't wildcard.
      const like = Prisma.sql`immutable_unaccent(lower(${token.replace(/[\\%_]/g, (c) => `\\${c}`)}))`;
      const T = INSTITUTION_SEARCH_TIERS;
      return Prisma.sql`GREATEST(
        CASE WHEN sigla IS NOT NULL AND immutable_unaccent(lower(sigla)) = ${exact} THEN ${T.SIGLA_EXACT} ELSE 0 END,
        CASE WHEN immutable_unaccent(lower(nome)) LIKE ${like} || '%' THEN ${T.NOME_PREFIX} ELSE 0 END,
        CASE WHEN immutable_unaccent(lower(nome)) LIKE '%' || ${like} || '%' THEN ${T.NOME_CONTAINS} ELSE 0 END,
        CASE WHEN sigla IS NOT NULL AND immutable_unaccent(lower(sigla)) LIKE '%' || ${like} || '%' THEN ${T.SIGLA_CONTAINS} ELSE 0 END,
        CASE WHEN municipio IS NOT NULL AND immutable_unaccent(lower(municipio)) LIKE '%' || ${like} || '%' THEN ${T.MUNICIPIO_CONTAINS} ELSE 0 END,
        CASE WHEN lower(uf) = ${exact} THEN ${T.UF_EXACT} ELSE 0 END,
        CASE WHEN organizacao IS NOT NULL AND immutable_unaccent(lower(organizacao)) LIKE '%' || ${like} || '%' THEN ${T.ORGANIZACAO_CONTAINS} ELSE 0 END
      )`;
    });

    // AND semantics: a row only qualifies when every token matched
    // something — i.e. its weakest token score is > 0.
    return this.prisma.$queryRaw<Institution[]>`
      SELECT id, "codigoIes", nome, sigla, uf, municipio, categoria, organizacao
      FROM (
        SELECT *,
          ${Prisma.join(tokenScores, ' + ')} AS search_score,
          LEAST(${Prisma.join(tokenScores, ', ')}) AS weakest_token_score
        FROM "MecInstitution"
        WHERE "isActive" = true
      ) ranked
      WHERE weakest_token_score > 0
      ORDER BY search_score DESC, nome ASC
      LIMIT ${limit}
    `;
  }

  async listDistinctUfs(): Promise<string[]> {
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

  async listExistingInstitutionCodes(): Promise<Set<number>> {
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
