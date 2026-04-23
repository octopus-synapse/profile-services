import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  FitAnswerRepositoryPort,
  type FitAnswerWrite,
  type SavedFitAnswer,
} from '../../../domain/ports/fit-answer.repository.port';

@Injectable()
export class PrismaFitAnswerRepository extends FitAnswerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async saveBatch(answers: readonly FitAnswerWrite[]): Promise<readonly SavedFitAnswer[]> {
    if (answers.length === 0) return [];
    const created = await this.prisma.$transaction(
      answers.map((a) =>
        this.prisma.fitAnswer.create({
          data: {
            userId: a.userId,
            questionId: a.questionId,
            questionSetId: a.questionSetId,
            rawValue: a.rawValue,
          },
        }),
      ),
    );
    return created.map((row) => this.toDomain(row));
  }

  async listByUser(userId: string): Promise<readonly SavedFitAnswer[]> {
    const rows = await this.prisma.fitAnswer.findMany({
      where: { userId },
      orderBy: { answeredAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async listByQuestionSet(questionSetId: string): Promise<readonly SavedFitAnswer[]> {
    const rows = await this.prisma.fitAnswer.findMany({
      where: { questionSetId },
      orderBy: { answeredAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.prisma.fitAnswer.deleteMany({ where: { userId } });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    questionId: string;
    questionSetId: string;
    rawValue: number;
    answeredAt: Date;
  }): SavedFitAnswer {
    return {
      id: row.id,
      userId: row.userId,
      questionId: row.questionId,
      questionSetId: row.questionSetId,
      rawValue: row.rawValue,
      answeredAt: row.answeredAt,
    };
  }
}
