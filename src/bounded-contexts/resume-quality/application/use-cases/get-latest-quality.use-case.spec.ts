import { describe, expect, it } from 'bun:test';
import {
  QualityScoreRepositoryPort,
  type SavedQualityScore,
} from '../../domain/ports/quality-score.repository.port';
import type { QualityBreakdown } from '../../domain/types';
import { GetLatestQualityUseCase } from './get-latest-quality.use-case';

class StubRepo extends QualityScoreRepositoryPort {
  constructor(private readonly latest: SavedQualityScore | null) {
    super();
  }
  async save(_resumeId: string, _breakdown: QualityBreakdown): Promise<SavedQualityScore> {
    throw new Error('not used in this test');
  }
  async findLatest() {
    return this.latest;
  }
  async findLatestForOwner() {
    return { found: false, owned: false, snapshot: null };
  }
  async findHistory() {
    return [];
  }
}

describe('GetLatestQualityUseCase', () => {
  it('returns null when no snapshot exists', async () => {
    const useCase = new GetLatestQualityUseCase(new StubRepo(null));
    expect(await useCase.execute('r1')).toBeNull();
  });

  it('returns the latest snapshot when present', async () => {
    const snapshot: SavedQualityScore = {
      id: 's1',
      resumeId: 'r1',
      overallScore: 88,
      completenessScore: 100,
      contentQualityScore: 80,
      issues: [],
      scoringRulesVersion: '1.0.0',
      aiPromptVersion: null,
      aiCallsCount: 0,
      costUsdMicros: 0n,
      computedAt: new Date('2026-04-23T12:00:00Z'),
    };
    const useCase = new GetLatestQualityUseCase(new StubRepo(snapshot));
    expect(await useCase.execute('r1')).toBe(snapshot);
  });
});
