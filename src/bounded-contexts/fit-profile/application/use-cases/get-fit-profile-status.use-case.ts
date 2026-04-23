import { Injectable } from '@nestjs/common';
import { FitQuestionSetRepositoryPort } from '../../domain/ports/fit-question-set.repository.port';
import {
  type SavedUserFitProfile,
  UserFitProfileRepositoryPort,
} from '../../domain/ports/user-fit-profile.repository.port';
import { type FitProfileStatus, QUESTION_SET_SIZE } from '../../domain/types';

export interface FitProfileStatusView {
  readonly status: FitProfileStatus;
  readonly profile: SavedUserFitProfile | null;
  readonly answeredAt: Date | null;
  readonly expiresAt: Date | null;
  readonly remainingQuestions: 0 | typeof QUESTION_SET_SIZE;
}

/** Resolves the lifecycle state the UI uses to decide whether to show
 * the questionnaire, a "your vector is valid until X" card, or a
 * lockout banner. The Fit Score itself is intentionally opaque to the
 * user per `docs/scoring/README.md`, so this endpoint returns the raw
 * vector (for debugging / advanced clients) but never a score. */
@Injectable()
export class GetFitProfileStatusUseCase {
  constructor(
    private readonly profiles: UserFitProfileRepositoryPort,
    private readonly questionSets: FitQuestionSetRepositoryPort,
  ) {}

  async execute(userId: string, now: Date = new Date()): Promise<FitProfileStatusView> {
    const profile = await this.profiles.findByUserId(userId);
    const setCount = await this.questionSets.countByUser(userId);

    if (!profile || profile.vector === null) {
      return this.buildView('never', profile, null, null, setCount);
    }

    if (profile.expiresAt.getTime() <= now.getTime()) {
      return this.buildView('expired', profile, profile.computedAt, profile.expiresAt, setCount);
    }

    return this.buildView('responded', profile, profile.computedAt, profile.expiresAt, setCount);
  }

  private buildView(
    status: FitProfileStatus,
    profile: SavedUserFitProfile | null,
    answeredAt: Date | null,
    expiresAt: Date | null,
    _setCount: number,
  ): FitProfileStatusView {
    const remainingQuestions: 0 | typeof QUESTION_SET_SIZE =
      status === 'responded' ? 0 : QUESTION_SET_SIZE;
    return { status, profile, answeredAt, expiresAt, remainingQuestions };
  }
}
