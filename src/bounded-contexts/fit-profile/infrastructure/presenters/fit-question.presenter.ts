import type { QuestionSetView } from '../../application/use-cases/get-or-create-question-set.use-case';
import type { FitQuestionRecord } from '../../domain/ports/fit-question.repository.port';
import type {
  FitQuestionListResponseDto,
  FitQuestionResponseDto,
} from '../../dto/admin-fit-question.schema';
import type { FitQuestionsResponseDto } from '../../dto/fit-questions-response.schema';

export function toFitQuestionsResponseDto(view: QuestionSetView): FitQuestionsResponseDto {
  return {
    questionSetId: view.set.id,
    seed: view.set.seed,
    createdAt: view.set.createdAt.toISOString(),
    questions: view.questions.map((q) => ({
      id: q.id,
      key: q.key,
      dimension: q.dimension,
      textEn: q.textEn,
      textPtBr: q.textPtBr,
      scaleType: q.scaleType,
      weight: q.weight,
    })),
  };
}

export function toFitQuestionResponseDto(q: FitQuestionRecord): FitQuestionResponseDto {
  return {
    id: q.id,
    key: q.key,
    dimension: q.dimension,
    textEn: q.textEn,
    textPtBr: q.textPtBr,
    scaleType: q.scaleType,
    weight: q.weight,
    isActive: q.isActive,
    reverseScored: q.reverseScored ?? false,
  };
}

export function toFitQuestionListResponseDto(
  rows: readonly FitQuestionRecord[],
): FitQuestionListResponseDto {
  return { items: rows.map((q) => toFitQuestionResponseDto(q)) };
}
