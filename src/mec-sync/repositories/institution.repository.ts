/**
 * Institution Repository
 * Single Responsibility: Data access for MEC institutions
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InstitutionDto } from '../dto';
import { NormalizedInstitution } from '../interfaces/mec-data.interface';
import { BATCH_SIZE } from '../constants';

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

  async findAll(): Promise<InstitutionDto[]> {
    return this.prisma.mecInstitution.findMany({
      where: { isActive: true },
      orderBy: [{ uf: 'asc' }, { nome: 'asc' }],
      select: INSTITUTION_SELECT,
    });
  }

  async findByUf(uf: string): Promise<InstitutionDto[]> {
    return this.prisma.mecInstitution.findMany({
      where: { uf: uf.toUpperCase(), isActive: true },
      orderBy: { nome: 'asc' },
      select: INSTITUTION_SELECT,
    });
  }

  async findByCode(codigoIes: number) {
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

  async search(query: string, limit: number): Promise<InstitutionDto[]> {
    return this.prisma.$queryRaw<InstitutionDto[]>`
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

  async getDistinctUfs(): Promise<string[]> {
    const ufs = await this.prisma.mecInstitution.findMany({
      where: { isActive: true },
      select: { uf: true },
      distinct: ['uf'],
      orderBy: { uf: 'asc' },
    });
    return ufs.map((u) => u.uf);
  }

  async countByUf() {
    return this.prisma.mecInstitution.groupBy({
      by: ['uf'],
      where: { isActive: true },
      _count: true,
      orderBy: { uf: 'asc' },
    });
  }

  async count(): Promise<number> {
    return this.prisma.mecInstitution.count({ where: { isActive: true } });
  }

  async getExistingCodes(): Promise<Set<number>> {
    const existing = await this.prisma.mecInstitution.findMany({
      select: { codigoIes: true },
    });
    return new Set(existing.map((i) => i.codigoIes));
  }

  async bulkCreate(institutions: NormalizedInstitution[]): Promise<number> {
    let inserted = 0;

    for (let i = 0; i < institutions.length; i += BATCH_SIZE) {
      const batch = institutions.slice(i, i + BATCH_SIZE);

      await this.prisma.mecInstitution.createMany({
        data: batch.map((inst) => ({
          codigoIes: inst.codigoIes,
          nome: inst.nome,
          sigla: inst.sigla,
          organizacao: inst.organizacao,
          categoria: inst.categoria,
          uf: inst.uf,
          municipio: inst.municipio,
          codigoMunicipio: inst.codigoMunicipio,
        })),
        skipDuplicates: true,
      });

      inserted += batch.length;
    }

    return inserted;
  }
}
