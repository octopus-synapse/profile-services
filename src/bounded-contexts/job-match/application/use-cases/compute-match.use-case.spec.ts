import { beforeEach, describe, expect, it } from 'bun:test';
import {
  SimilarityPort,
  type SimilarityResult,
} from '@/bounded-contexts/fit-profile/domain/ports/similarity.port';
import type { EventPublisher } from '@/shared-kernel';

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

import { type JobForMatch, JobLoaderPort } from '../../domain/ports/job-loader.port';
import { MatchCachePort } from '../../domain/ports/match-cache.port';
import {
  RequirementsMatcherPort,
  type RequirementsMatchResult,
} from '../../domain/ports/requirements-matcher.port';
import { ResumeExistencePort } from '../../domain/ports/resume-existence.port';
import { ResumeKeywordSourcePort } from '../../domain/ports/resume-keyword-source.port';
import {
  SemanticMatcherPort,
  type SemanticMatchResult,
} from '../../domain/ports/semantic-matcher.port';
import { type UserFitState, UserFitStatePort } from '../../domain/ports/user-fit-state.port';
import type { MatchBreakdown } from '../../domain/types';
import {
  ComputeMatchUseCase,
  FitProfileRequiredForMatchError,
  JobNotFoundForMatchError,
  ResumeNotFoundForMatchError,
} from './compute-match.use-case';

class FakeResumeExistence extends ResumeExistencePort {
  constructor(private readonly present: boolean) {
    super();
  }
  async exists() {
    return this.present;
  }
}

class FakeJobLoader extends JobLoaderPort {
  constructor(private readonly job: JobForMatch | null) {
    super();
  }
  async load() {
    return this.job;
  }
}

class FakeFitState extends UserFitStatePort {
  constructor(private readonly status: UserFitState['status']) {
    super();
  }
  async getStatus(userId: string): Promise<UserFitState> {
    return { userId, status: this.status };
  }
}

class FakeKeywordSource extends ResumeKeywordSourcePort {
  constructor(private readonly keywords: readonly string[]) {
    super();
  }
  async getKeywords() {
    return this.keywords;
  }
}

class FakeRequirements extends RequirementsMatcherPort {
  constructor(private readonly result: RequirementsMatchResult | Error) {
    super();
  }
  async match() {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class FakeSemantic extends SemanticMatcherPort {
  constructor(private readonly result: SemanticMatchResult | Error) {
    super();
  }
  async match() {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class FakeSimilarity extends SimilarityPort {
  constructor(
    private readonly roleResult: SimilarityResult,
    private readonly cultureResult: SimilarityResult = {
      score: null,
      algorithm: 'weighted-cosine',
      rulesVersion: '1.0.0',
    },
  ) {
    super();
  }
  async role() {
    return this.roleResult;
  }
  async culture() {
    return this.cultureResult;
  }
}

class InMemoryMatchCache extends MatchCachePort {
  public reads = 0;
  public writes = 0;
  private store = new Map<string, MatchBreakdown>();
  async get(key: string) {
    this.reads++;
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: MatchBreakdown) {
    this.writes++;
    this.store.set(key, value);
  }
}

function defaultJob(overrides: Partial<JobForMatch> = {}): JobForMatch {
  return {
    id: 'j1',
    keywords: ['Rust', 'Tokio'],
    structuredRequirements: { minYears: 5 },
    culturalProfileCaptured: false,
    companyId: null,
    ...overrides,
  };
}

function similarityOk(score: number): SimilarityResult {
  return { score, algorithm: 'weighted-cosine', rulesVersion: '1.0.0' };
}

describe('ComputeMatchUseCase', () => {
  let cache: InMemoryMatchCache;

  beforeEach(() => {
    cache = new InMemoryMatchCache();
  });

  function build(
    overrides: {
      exists?: boolean;
      job?: JobForMatch | null;
      fit?: UserFitState['status'];
      keywords?: readonly string[];
      requirements?: RequirementsMatchResult | Error;
      semantic?: SemanticMatchResult | Error;
      similarity?: FakeSimilarity;
    } = {},
  ) {
    return new ComputeMatchUseCase(
      new FakeResumeExistence(overrides.exists ?? true),
      new FakeJobLoader(overrides.job === undefined ? defaultJob() : overrides.job),
      new FakeFitState(overrides.fit ?? 'responded'),
      new FakeKeywordSource(overrides.keywords ?? ['Rust', 'Tokio']),
      new FakeRequirements(
        overrides.requirements ?? { score: 80, detail: { matchedSlots: [], missingSlots: [] } },
      ),
      new FakeSemantic(overrides.semantic ?? { score: 75 }),
      overrides.similarity ?? new FakeSimilarity(similarityOk(60)),
      cache,
      stubEventPublisher,
    );
  }

  it('throws when the resume is missing', async () => {
    const useCase = build({ exists: false });
    await expect(
      useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' }),
    ).rejects.toBeInstanceOf(ResumeNotFoundForMatchError);
  });

  it('throws when the job is missing', async () => {
    const useCase = build({ job: null });
    await expect(
      useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' }),
    ).rejects.toBeInstanceOf(JobNotFoundForMatchError);
  });

  it('throws when the user has no fit profile (or expired)', async () => {
    const expired = build({ fit: 'expired' });
    await expect(
      expired.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' }),
    ).rejects.toBeInstanceOf(FitProfileRequiredForMatchError);
    const never = build({ fit: 'never' });
    await expect(
      never.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' }),
    ).rejects.toBeInstanceOf(FitProfileRequiredForMatchError);
  });

  it('composes the overall score from the four sub-scores when everything succeeds', async () => {
    const useCase = build();
    const result = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    expect(result.subScores.keyword.score).toBe(100);
    expect(result.subScores.requirements.score).toBe(80);
    expect(result.subScores.semantic.score).toBe(75);
    expect(result.subScores.fit.score).toBe(60);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(cache.writes).toBe(1);
  });

  it('degrades gracefully when the semantic adapter throws', async () => {
    const useCase = build({ semantic: new Error('openai down') });
    const result = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    expect(result.subScores.semantic.score).toBeNull();
    expect(result.effectiveWeights.semantic).toBe(0);
    // Remaining weights must still sum to 1
    const sum =
      result.effectiveWeights.keyword +
      result.effectiveWeights.requirements +
      result.effectiveWeights.fit;
    expect(sum).toBeCloseTo(1, 5);
    expect(result.overallScore).toBeGreaterThan(0);
  });

  it('folds Culture Match into the Fit sub-score when the job has a cultural profile', async () => {
    const similarity = new FakeSimilarity(similarityOk(80), similarityOk(40));
    const useCase = build({
      job: defaultJob({ culturalProfileCaptured: true, companyId: 'c1' }),
      similarity,
    });
    const result = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    // Fit = 0.4 * culture(40) + 0.6 * role(80) = 16 + 48 = 64
    expect(result.subScores.fit.score).toBe(64);
  });

  it('serves a cached breakdown when present and does not rerun sub-scores', async () => {
    const useCase = build();
    const first = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    const second = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    expect(second).toEqual(first);
    expect(cache.reads).toBeGreaterThanOrEqual(2);
    // Only the first run wrote to the cache.
    expect(cache.writes).toBe(1);
  });
});
