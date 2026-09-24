import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { runInTransaction } from '@/shared-kernel/persistence/transaction';
import {
  FitAnswerRepositoryPort,
  type FitAnswerWrite,
  type SavedFitAnswer,
} from '../../../domain/ports/fit-answer.repository.port';

export class PrismaFitAnswerRepository extends FitAnswerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async saveBatch(answers: readonly FitAnswerWrite[]): Promise<readonly SavedFitAnswer[]> {
    if (answers.length === 0) return [];
    const created = await runInTransaction(this.prisma, (tx) =>
      Promise.all(
        answers.map((answer) =>
          tx.fitAnswer.create({
            data: {
              userId: answer.userId,
              questionId: answer.questionId,
              questionSetId: answer.questionSetId,
              rawValue: answer.rawValue,
            },
          }),
        ),
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
