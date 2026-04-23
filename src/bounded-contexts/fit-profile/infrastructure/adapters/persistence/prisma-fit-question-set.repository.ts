import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  FitQuestionSetRepositoryPort,
  type FitQuestionSetWrite,
  type SavedFitQuestionSet,
} from '../../../domain/ports/fit-question-set.repository.port';

@Injectable()
export class PrismaFitQuestionSetRepository extends FitQuestionSetRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findOpenByUserId(userId: string): Promise<SavedFitQuestionSet | null> {
    const row = await this.prisma.fitQuestionSet.findFirst({
      where: { userId, completedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<SavedFitQuestionSet | null> {
    const row = await this.prisma.fitQuestionSet.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findBySeed(userId: string, seed: string): Promise<SavedFitQuestionSet | null> {
    const row = await this.prisma.fitQuestionSet.findFirst({ where: { userId, seed } });
    return row ? this.toDomain(row) : null;
  }

  async create(input: FitQuestionSetWrite): Promise<SavedFitQuestionSet> {
    const row = await this.prisma.fitQuestionSet.create({
      data: { userId: input.userId, seed: input.seed },
    });
    return this.toDomain(row);
  }

  async markCompleted(id: string, completedAt: Date): Promise<void> {
    await this.prisma.fitQuestionSet.update({ where: { id }, data: { completedAt } });
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.fitQuestionSet.count({ where: { userId } });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    seed: string;
    createdAt: Date;
    completedAt: Date | null;
  }): SavedFitQuestionSet {
    return {
      id: row.id,
      userId: row.userId,
      seed: row.seed,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  }
}
