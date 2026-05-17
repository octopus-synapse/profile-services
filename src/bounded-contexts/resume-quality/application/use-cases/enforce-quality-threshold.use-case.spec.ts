import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  ResumeQualityAuthenticatedUserMissingException,
  ResumeQualityBelowThresholdException,
  ResumeQualityNotOwnedException,
  ResumeQualityScoreUnavailableException,
} from '../../domain/exceptions/resume-quality.exceptions';
import {
  QualityScoreRepositoryPort,
  type SavedQualityScore,
} from '../../domain/ports/quality-score.repository.port';
import type { QualityBreakdown } from '../../domain/types';
import { EnforceQualityThresholdUseCase } from './enforce-quality-threshold.use-case';

class StubRepo extends QualityScoreRepositoryPort {
  constructor(
    private readonly latest: SavedQualityScore | null,
    private readonly ownerOpts: { found: boolean; owned: boolean } = { found: true, owned: true },
  ) {
    super();
  }
  async save(_resumeId: string, _breakdown: QualityBreakdown): Promise<SavedQualityScore> {
    throw new Error('not used');
  }
  async findLatest() {
    return this.latest;
  }
  async findLatestForOwner(_u: string, _r: string) {
    return {
      found: this.ownerOpts.found,
      owned: this.ownerOpts.owned,
      snapshot: this.ownerOpts.owned ? this.latest : null,
    };
  }
  async findHistory() {
    return [];
  }
}

function snapshot(overallScore: number): SavedQualityScore {
  return {
    id: 's1',
    resumeId: 'r1',
    overallScore,
    completenessScore: overallScore,
    contentQualityScore: overallScore,
    issues: [],
    scoringRulesVersion: '1.0.0',
    aiPromptVersion: null,
    aiCallsCount: 0,
    costUsdMicros: 0n,
    computedAt: new Date(),
  };
}

describe('EnforceQualityThresholdUseCase', () => {
  it('throws ResumeQualityAuthenticatedUserMissingException when userId is missing', async () => {
    const useCase = new EnforceQualityThresholdUseCase(new StubRepo(snapshot(90)));
    await expect(
      useCase.execute({ resumeId: 'r1', threshold: 70, userId: undefined }),
    ).rejects.toBeInstanceOf(ResumeQualityAuthenticatedUserMissingException);
  });

  it('throws ResumeQualityScoreUnavailableException when no snapshot exists', async () => {
    const useCase = new EnforceQualityThresholdUseCase(new StubRepo(null));
    await expect(
      useCase.execute({ resumeId: 'r1', threshold: 70, userId: 'u1' }),
    ).rejects.toBeInstanceOf(ResumeQualityScoreUnavailableException);
  });

  it('throws ResumeQualityBelowThresholdException when score is below threshold', async () => {
    const useCase = new EnforceQualityThresholdUseCase(new StubRepo(snapshot(60)));
    await expect(
      useCase.execute({ resumeId: 'r1', threshold: 80, userId: 'u1' }),
    ).rejects.toBeInstanceOf(ResumeQualityBelowThresholdException);
  });

  it('resolves silently when the score is at or above the threshold', async () => {
    const useCase = new EnforceQualityThresholdUseCase(new StubRepo(snapshot(85)));
    await expect(
      useCase.execute({ resumeId: 'r1', threshold: 80, userId: 'u1' }),
    ).resolves.toBeUndefined();
  });

  // P1 #32
  it('throws EntityNotFoundException when the resume does not exist', async () => {
    const useCase = new EnforceQualityThresholdUseCase(
      new StubRepo(snapshot(90), { found: false, owned: false }),
    );
    await expect(
      useCase.execute({ resumeId: 'r-missing', threshold: 70, userId: 'u1' }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('throws ResumeQualityNotOwnedException when caller does not own the resume', async () => {
    const useCase = new EnforceQualityThresholdUseCase(
      new StubRepo(snapshot(90), { found: true, owned: false }),
    );
    await expect(
      useCase.execute({ resumeId: 'r-other', threshold: 70, userId: 'u1' }),
    ).rejects.toBeInstanceOf(ResumeQualityNotOwnedException);
  });
});
