/**
 * Institution Repository
 * Single Responsibility: Data access for MEC institutions
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { Institution } from '@/shared-kernel';
import { BATCH_SIZE } from '../constants';
import { NormalizedInstitution } from '../interfaces/mec-data.interface';

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

@Injectable()
export class InstitutionRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async findInstitutionByCode(codigoIes: number) {
    return this.prisma.mecInstitution.findUnique({
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
  }

  async search(query: string, limit: number): Promise<Institution[]> {
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

  async searchInstitutionsByName(query: string, limit: number): Promise<Institution[]> {
    return this.search(query, limit);
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

  async countByUf(): Promise<Array<{ uf: string; _count: number }>> {
    const result = await this.prisma.mecInstitution.groupBy({
      by: ['uf'],
      where: { isActive: true },
      _count: { _all: true },
      orderBy: { uf: 'asc' },
    });
    return result.map((r) => ({
      uf: r.uf,
      _count: r._count._all,
    }));
  }

  async countInstitutionsByUf(): Promise<Array<{ uf: string; _count: number }>> {
    return this.countByUf();
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

  async bulkCreateInstitutions(normalizedInstitutions: NormalizedInstitution[]): Promise<number> {
    let insertedInstitutionCount = 0;

    for (let batchIndex = 0; batchIndex < normalizedInstitutions.length; batchIndex += BATCH_SIZE) {
      const institutionBatch = normalizedInstitutions.slice(batchIndex, batchIndex + BATCH_SIZE);

      await this.prisma.mecInstitution.createMany({
        data: institutionBatch.map((institution) => ({
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

      insertedInstitutionCount += institutionBatch.length;
    }

    return insertedInstitutionCount;
  }
}
