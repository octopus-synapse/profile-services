import { describe, expect, it } from 'bun:test';
import {
  SimilarityPort,
  type SimilarityResult,
} from '@/bounded-contexts/fit-profile/domain/ports/similarity.port';
import type { EventPublisher } from '@/shared-kernel';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { type JobForMatch, JobLoaderPort } from '../../../domain/ports/job-loader.port';
import { MatchCachePort } from '../../../domain/ports/match-cache.port';
import {
  RequirementsMatcherPort,
  type RequirementsMatchResult,
} from '../../../domain/ports/requirements-matcher.port';
import { ResumeExistencePort } from '../../../domain/ports/resume-existence.port';
import { ResumeKeywordSourcePort } from '../../../domain/ports/resume-keyword-source.port';
import {
  SemanticMatcherPort,
  type SemanticMatchResult,
} from '../../../domain/ports/semantic-matcher.port';
import { type UserFitState, UserFitStatePort } from '../../../domain/ports/user-fit-state.port';
import type { MatchBreakdown } from '../../../domain/types';
import { ComputeMatchUseCase } from '../compute-match.use-case';

/**
 * Scoring snapshot — fixes the expected match output for a 3×2 grid
 * (resume archetype × job profile). Sub-score providers are stubbed
 * with deterministic values so the snapshot exercises the blender
 * and weight reallocation, not the underlying AI / embeddings paths.
 */

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

class FakeExists extends ResumeExistencePort {
  async exists() {
    return true;
  }
}
class FakeJob extends JobLoaderPort {
  constructor(private readonly job: JobForMatch) {
    super();
  }
  async load() {
    return this.job;
  }
}
class FakeFit extends UserFitStatePort {
  async getStatus(userId: string): Promise<UserFitState> {
    return { userId, status: 'responded' };
  }
}
class FakeKeywordSource extends ResumeKeywordSourcePort {
  constructor(private readonly kw: readonly string[]) {
    super();
  }
  async getKeywords() {
    return this.kw;
  }
}
class FakeReq extends RequirementsMatcherPort {
  constructor(private readonly result: RequirementsMatchResult) {
    super();
  }
  async match() {
    return this.result;
  }
}
class FakeSem extends SemanticMatcherPort {
  constructor(private readonly result: SemanticMatchResult) {
    super();
  }
  async match() {
    return this.result;
  }
}
class FakeSim extends SimilarityPort {
  constructor(private readonly r: SimilarityResult) {
    super();
  }
  async role() {
    return this.r;
  }
  async culture(): Promise<SimilarityResult> {
    return { score: null, algorithm: 'weighted-cosine', rulesVersion: '1.0.0' };
  }
}
class NoopCache extends MatchCachePort {
  async get() {
    return null;
  }
  async set(_key: string, _value: MatchBreakdown) {
    // intentional no-op
  }
  async acquireLock() {
    return { release: async () => {} };
  }
}

const JOB_BACKEND: JobForMatch = {
  id: 'j-backend',
  keywords: ['Go', 'PostgreSQL', 'Kafka'],
  structuredRequirements: { minYears: 5 },
  culturalProfileCaptured: false,
  companyId: null,
};
const JOB_FRONTEND: JobForMatch = {
  id: 'j-frontend',
  keywords: ['React', 'TypeScript', 'CSS'],
  structuredRequirements: { minYears: 3 },
  culturalProfileCaptured: false,
  companyId: null,
};

type Stub = {
  job: JobForMatch;
  resumeKeywords: readonly string[];
  reqScore: number | null;
  semScore: number | null;
  fitScore: number | null;
};

function build(stub: Stub) {
  return new ComputeMatchUseCase(
    new FakeExists(),
    new FakeJob(stub.job),
    new FakeFit(),
    new FakeKeywordSource(stub.resumeKeywords),
    new FakeReq({ score: stub.reqScore }),
    new FakeSem({ score: stub.semScore }),
    new FakeSim({ score: stub.fitScore, algorithm: 'weighted-cosine', rulesVersion: '1.0.0' }),
    new NoopCache(),
    stubEventPublisher,
    stubLogger,
  );
}

async function run(stub: Stub) {
  return build(stub).execute({ userId: 'u1', resumeId: 'r1', jobId: stub.job.id });
}

describe('ComputeMatchUseCase — scoring snapshot', () => {
  it('strong backend candidate × backend job: high overall, all sub-scores present', async () => {
    const r = await run({
      job: JOB_BACKEND,
      resumeKeywords: ['Go', 'PostgreSQL', 'Kafka'],
      reqScore: 90,
      semScore: 85,
      fitScore: 70,
    });
    expect(r.subScores.keyword.score).toBe(100);
    expect(r.subScores.requirements.score).toBe(90);
    expect(r.subScores.semantic.score).toBe(85);
    expect(r.subScores.fit.score).toBe(70);
    // 0.25*100 + 0.30*90 + 0.25*85 + 0.20*70 = 25 + 27 + 21.25 + 14 = 87.25 → 87
    expect(r.overallScore).toBe(87);
    // Weights unchanged when all sub-scores present.
    expect(r.effectiveWeights).toMatchObject({
      keyword: 0.25,
      requirements: 0.3,
      semantic: 0.25,
      fit: 0.2,
    });
  });

  it('strong candidate × frontend job (mismatched keywords): blender drops keyword to 0', async () => {
    const r = await run({
      job: JOB_FRONTEND,
      resumeKeywords: ['Go', 'Rust'],
      reqScore: 50,
      semScore: 40,
      fitScore: 60,
    });
    expect(r.subScores.keyword.score).toBe(0);
    expect(r.overallScore).toBeGreaterThan(0);
    expect(r.overallScore).toBeLessThan(60);
  });

  it('semantic provider degraded (null): weight reallocates, overall recomputed without it', async () => {
    const r = await run({
      job: JOB_BACKEND,
      resumeKeywords: ['Go', 'PostgreSQL', 'Kafka'],
      reqScore: 90,
      semScore: null, // AI down
      fitScore: 70,
    });
    expect(r.subScores.semantic.score).toBeNull();
    expect(r.effectiveWeights.semantic).toBe(0);
    const sumPresent =
      r.effectiveWeights.keyword + r.effectiveWeights.requirements + r.effectiveWeights.fit;
    expect(sumPresent).toBeCloseTo(1, 5);
    // Renormalised: keyword + req + fit weights = 0.75 → divide each by 0.75.
    // Expected = (100 * 0.25 + 90 * 0.3 + 70 * 0.2) / 0.75
    //         = (25 + 27 + 14) / 0.75 = 88.0 → 88
    expect(r.overallScore).toBe(88);
  });

  it('all AI sub-scores null: keyword + fit carry the blend', async () => {
    const r = await run({
      job: JOB_BACKEND,
      resumeKeywords: ['Go', 'PostgreSQL', 'Kafka'],
      reqScore: null,
      semScore: null,
      fitScore: 50,
    });
    expect(r.subScores.requirements.score).toBeNull();
    expect(r.subScores.semantic.score).toBeNull();
    expect(r.effectiveWeights.requirements).toBe(0);
    expect(r.effectiveWeights.semantic).toBe(0);
    // Active weights: keyword 0.25 + fit 0.20 = 0.45
    // (100 * 0.25 + 50 * 0.20) / 0.45 = (25 + 10) / 0.45 = 77.78 → 78
    expect(r.overallScore).toBe(78);
  });

  it('weak candidate × backend job: low overall, no surprises', async () => {
    const r = await run({
      job: JOB_BACKEND,
      resumeKeywords: ['Java'],
      reqScore: 20,
      semScore: 30,
      fitScore: 40,
    });
    expect(r.subScores.keyword.score).toBe(0);
    expect(r.overallScore).toBeLessThan(35);
  });

  it('mid candidate × frontend job: balanced sub-scores produce mid overall', async () => {
    const r = await run({
      job: JOB_FRONTEND,
      resumeKeywords: ['React', 'CSS'],
      reqScore: 65,
      semScore: 70,
      fitScore: 60,
    });
    // keyword: 2 of 3 matched (React, CSS missing TypeScript) → ~67 (rounded)
    expect(r.subScores.keyword.score).toBeGreaterThanOrEqual(60);
    expect(r.subScores.keyword.score).toBeLessThanOrEqual(80);
    expect(r.overallScore).toBeGreaterThan(55);
    expect(r.overallScore).toBeLessThan(75);
  });
});
