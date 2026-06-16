import { describe, expect, it } from 'bun:test';
import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import type {
  ContentQualityInput,
  ContentQualityResult as LlmResult,
  ScoringLlmPort,
} from '@/bounded-contexts/ai/domain/ports/scoring-llm.port';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { ResumeForCompleteness } from '../../domain/rules/completeness.rules';
import { AiContentQualityAdapter } from './ai-content-quality.adapter';

const enabledFlags = { isEnabled: async () => true } as unknown as FeatureFlagService;
const disabledFlags = { isEnabled: async () => false } as unknown as FeatureFlagService;

class CapturingScoringLlm implements ScoringLlmPort {
  public lastInput: ContentQualityInput | null = null;
  constructor(private readonly result: LlmResult) {}
  async analyzeContentQuality(input: ContentQualityInput): Promise<LlmResult> {
    this.lastInput = input;
    return this.result;
  }
  async normalizeRequirements(): Promise<never> {
    throw new Error('not used');
  }
}

function resume(overrides: Partial<ResumeForCompleteness> = {}): ResumeForCompleteness {
  return {
    fullName: 'Jane',
    summary: 'Engineer.',
    jobTitle: 'Engineer',
    language: 'pt-br',
    experiences: [{ role: 'Engineer', company: 'Acme' }],
    educations: [],
    skills: [],
    bullets: [{ id: 'exp:0:description', text: 'Led the payments rewrite', sectionKind: 'WORK_EXPERIENCE' }],
    ...overrides,
  };
}

describe('AiContentQualityAdapter', () => {
  it('forwards real bullets and the resume language to the LLM', async () => {
    const llm = new CapturingScoringLlm({ score: 72, issues: [], tokensUsed: 0 });
    const adapter = new AiContentQualityAdapter(llm, enabledFlags, stubLogger);
    await adapter.analyze(resume());
    expect(llm.lastInput?.language).toBe('pt-br');
    expect(llm.lastInput?.bullets).toEqual([{ id: 'exp:0:description', text: 'Led the payments rewrite' }]);
  });

  it('computes costUsdMicros from tokens × price', async () => {
    const llm = new CapturingScoringLlm({ score: 72, issues: [], tokensUsed: 2000 });
    const adapter = new AiContentQualityAdapter(llm, enabledFlags, stubLogger, 400);
    const result = await adapter.analyze(resume());
    // 2000 tokens × 400 micros/1k = 800
    expect(result.costUsdMicros).toBe(800n);
  });

  it('leaves cost at 0 when no price is configured', async () => {
    const llm = new CapturingScoringLlm({ score: 72, issues: [], tokensUsed: 2000 });
    const adapter = new AiContentQualityAdapter(llm, enabledFlags, stubLogger);
    const result = await adapter.analyze(resume());
    expect(result.costUsdMicros).toBe(0n);
  });

  it('returns a null score when no bullets exist', async () => {
    const llm = new CapturingScoringLlm({ score: 72, issues: [], tokensUsed: 0 });
    const adapter = new AiContentQualityAdapter(llm, enabledFlags, stubLogger);
    const result = await adapter.analyze(resume({ bullets: [], experiences: [] }));
    expect(result.score).toBeNull();
  });

  it('degrades to null when the kill-switch flag is off', async () => {
    const llm = new CapturingScoringLlm({ score: 72, issues: [], tokensUsed: 0 });
    const adapter = new AiContentQualityAdapter(llm, disabledFlags, stubLogger);
    const result = await adapter.analyze(resume());
    expect(result.score).toBeNull();
    expect(llm.lastInput).toBeNull();
  });
});
