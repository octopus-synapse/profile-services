import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import {
  type FitQuestionInput,
  type FitQuestionPatch,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../../domain/ports/fit-question.repository.port';
import type { FitDimension, FitScaleType } from '../../../domain/types';

/** Persistence adapter for the `FitQuestion` pool. The "reverse-scored"
 * polarity isn't a Prisma column (Task #21's seed owns it); we infer it
 * from a suffix on the question `key` so the rules layer stays free of
 * null-vs-undefined gymnastics. Convention: keys ending in `.r` flip. */
const REVERSE_SCORED_SUFFIX = '.r';

@Injectable()
export class PrismaFitQuestionRepository extends FitQuestionRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async listActive(): Promise<readonly FitQuestionRecord[]> {
    const rows = await this.prisma.fitQuestion.findMany({ where: { isActive: true } });
    return rows.map((r) => this.toDomain(r));
  }

  async listAll(): Promise<readonly FitQuestionRecord[]> {
    const rows = await this.prisma.fitQuestion.findMany({ orderBy: { key: 'asc' } });
    return rows.map((r) => this.toDomain(r));
  }

  async findById(id: string): Promise<FitQuestionRecord | null> {
    const row = await this.prisma.fitQuestion.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findManyByIds(ids: readonly string[]): Promise<readonly FitQuestionRecord[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.fitQuestion.findMany({
      where: { id: { in: [...ids] } },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async create(input: FitQuestionInput): Promise<FitQuestionRecord> {
    const row = await this.prisma.fitQuestion.create({
      data: {
        key: this.encodeKey(input.key, input.reverseScored ?? false),
        dimension: input.dimension,
        textEn: input.textEn,
        textPtBr: input.textPtBr,
        scaleType: input.scaleType,
        weight: new Prisma.Decimal(input.weight),
        isActive: input.isActive ?? true,
      },
    });
    return this.toDomain(row);
  }

  async update(id: string, patch: FitQuestionPatch): Promise<FitQuestionRecord> {
    const data: Prisma.FitQuestionUpdateInput = {};
    if (patch.textEn !== undefined) data.textEn = patch.textEn;
    if (patch.textPtBr !== undefined) data.textPtBr = patch.textPtBr;
    if (patch.scaleType !== undefined) data.scaleType = patch.scaleType;
    if (patch.weight !== undefined) data.weight = new Prisma.Decimal(patch.weight);
    if (patch.isActive !== undefined) data.isActive = patch.isActive;
    if (patch.dimension !== undefined) data.dimension = patch.dimension;
    if (patch.reverseScored !== undefined) {
      const existing = await this.prisma.fitQuestion.findUnique({ where: { id } });
      if (existing) {
        const baseKey = this.stripSuffix(existing.key);
        data.key = this.encodeKey(baseKey, patch.reverseScored);
      }
    }
    const row = await this.prisma.fitQuestion.update({ where: { id }, data });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.fitQuestion.delete({ where: { id } });
  }

  private toDomain(row: {
    id: string;
    key: string;
    dimension: string;
    textEn: string;
    textPtBr: string;
    scaleType: string;
    weight: Prisma.Decimal;
    isActive: boolean;
  }): FitQuestionRecord {
    return {
      id: row.id,
      key: row.key,
      dimension: row.dimension as FitDimension,
      textEn: row.textEn,
      textPtBr: row.textPtBr,
      scaleType: row.scaleType as FitScaleType,
      weight: row.weight.toNumber(),
      isActive: row.isActive,
      reverseScored: row.key.endsWith(REVERSE_SCORED_SUFFIX),
    };
  }

  private encodeKey(key: string, reverse: boolean): string {
    const base = this.stripSuffix(key);
    return reverse ? `${base}${REVERSE_SCORED_SUFFIX}` : base;
  }

  private stripSuffix(key: string): string {
    return key.endsWith(REVERSE_SCORED_SUFFIX) ? key.slice(0, -REVERSE_SCORED_SUFFIX.length) : key;
  }
}
