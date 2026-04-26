import { beforeEach, describe, expect, it } from 'bun:test';
import { MatchComputedEvent } from '@/bounded-contexts/job-match/domain/events';
import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { MetricsService } from '../../metrics.service';
import { ScoreMetricsHandler } from '../score-metrics.handler';

/**
 * Locks the wiring contract for the metrics subscriber: the handler
 * must translate every score event into the right counter label and
 * a duration observation. The histogram value isn't asserted directly
 * (Prom-client's internal sum is awkward to read in tests) — the
 * label-tagged counter increment is the proxy that proves the path.
 */
describe('ScoreMetricsHandler', () => {
  let metrics: MetricsService;
  let handler: ScoreMetricsHandler;

  beforeEach(() => {
    metrics = new MetricsService();
    metrics.onModuleInit();
    handler = new ScoreMetricsHandler(metrics, stubLogger);
  });

  it('counts a resume-quality success when content quality has a value', async () => {
    handler.onResumeQualityComputed(
      new ResumeQualityComputedEvent('r1', {
        resumeId: 'r1',
        snapshotId: 's1',
        overallScore: 90,
        completenessScore: 100,
        contentQualityScore: 85,
        scoringRulesVersion: '1.0.0',
        aiPromptVersion: 'analyze-content-quality@1.0.0#abc',
        issuesCount: 0,
        highSeverityCount: 0,
        durationMs: 250,
        costUsdMicros: 500n,
        aiCallsCount: 1,
      }),
    );
    expect(
      await metrics.getMetricValue('score_computed_total', {
        type: 'resume_quality',
        outcome: 'success',
      }),
    ).toBe(1);
  });

  it('counts a resume-quality partial when content quality is null', async () => {
    handler.onResumeQualityComputed(
      new ResumeQualityComputedEvent('r1', {
        resumeId: 'r1',
        snapshotId: 's1',
        overallScore: 60,
        completenessScore: 60,
        contentQualityScore: null,
        scoringRulesVersion: '1.0.0',
        aiPromptVersion: null,
        issuesCount: 0,
        highSeverityCount: 0,
        durationMs: 50,
        costUsdMicros: 0n,
        aiCallsCount: 0,
      }),
    );
    expect(
      await metrics.getMetricValue('score_computed_total', {
        type: 'resume_quality',
        outcome: 'partial',
      }),
    ).toBe(1);
  });

  it('counts a match success when every sub-score has a value', async () => {
    handler.onMatchComputed(
      new MatchComputedEvent('j1', {
        userId: 'u1',
        resumeId: 'r1',
        jobId: 'j1',
        overallScore: 80,
        subScores: { keyword: 80, requirements: 90, semantic: 70, fit: 75 },
        effectiveWeights: { keyword: 0.25, requirements: 0.3, semantic: 0.25, fit: 0.2 },
        rulesVersion: '1.0.0',
        fromCache: false,
        durationMs: 1500,
      }),
    );
    expect(
      await metrics.getMetricValue('score_computed_total', { type: 'match', outcome: 'success' }),
    ).toBe(1);
  });

  it('counts a match partial when at least one sub-score is null', async () => {
    handler.onMatchComputed(
      new MatchComputedEvent('j1', {
        userId: 'u1',
        resumeId: 'r1',
        jobId: 'j1',
        overallScore: 70,
        subScores: { keyword: 80, requirements: 90, semantic: null, fit: 75 },
        effectiveWeights: { keyword: 0.33, requirements: 0.4, semantic: 0, fit: 0.27 },
        rulesVersion: '1.0.0',
        fromCache: true,
        durationMs: 5,
      }),
    );
    expect(
      await metrics.getMetricValue('score_computed_total', { type: 'match', outcome: 'partial' }),
    ).toBe(1);
  });

  it('keeps the duration histogram populated (count increments per event)', async () => {
    handler.onMatchComputed(
      new MatchComputedEvent('j1', {
        userId: 'u1',
        resumeId: 'r1',
        jobId: 'j1',
        overallScore: 80,
        subScores: { keyword: 80, requirements: 90, semantic: 70, fit: 75 },
        effectiveWeights: { keyword: 0.25, requirements: 0.3, semantic: 0.25, fit: 0.2 },
        rulesVersion: '1.0.0',
        fromCache: false,
        durationMs: 1500,
      }),
    );
    const histogram = metrics.getHistogramMetric('score_compute_duration_seconds');
    expect(histogram).toBeDefined();
    const collected = await histogram?.get();
    const countSample = collected?.values.find(
      (v) => v.metricName === 'score_compute_duration_seconds_count' && v.labels.type === 'match',
    );
    expect(countSample?.value).toBe(1);
  });
});
