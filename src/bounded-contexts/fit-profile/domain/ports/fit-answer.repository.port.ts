export interface FitAnswerWrite {
  readonly userId: string;
  readonly questionId: string;
  readonly questionSetId: string;
  readonly rawValue: number;
}

export interface SavedFitAnswer extends FitAnswerWrite {
  readonly id: string;
  readonly answeredAt: Date;
}

export abstract class FitAnswerRepositoryPort {
  abstract saveBatch(answers: readonly FitAnswerWrite[]): Promise<readonly SavedFitAnswer[]>;
  abstract listByUser(userId: string): Promise<readonly SavedFitAnswer[]>;
  abstract listByQuestionSet(questionSetId: string): Promise<readonly SavedFitAnswer[]>;
  abstract deleteByUser(userId: string): Promise<void>;
}
