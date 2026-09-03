import { describe, expect, it, mock } from 'bun:test';
import type { Locale } from '@packages/i18n';
import type {
  JsonValue,
  TranslationLlmPort,
} from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import { hashSource, type TranslationEnvelope } from '@/shared-kernel/i18n/translation-envelope';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { SEMANTIC_ROLE } from '@/shared-kernel/schemas/sections/semantic-role.const';
import {
  ResumeTranslationStorePort,
  type TranslatableResume,
} from '../../../domain/ports/resume-translation-store.port';
import {
  type TranslationCostEntry,
  TranslationCostLedgerPort,
} from '../../../domain/ports/translation-cost-ledger.port';
import {
  type TranslationProgress,
  TranslationProgressPort,
} from '../../../domain/ports/translation-progress.port';
import { TranslateResumeIntoLocaleUseCase } from './translate-resume-into-locale.use-case';

class MemoryStore extends ResumeTranslationStorePort {
  itemWrites: Array<{ itemId: string; locale: Locale; envelope: TranslationEnvelope }> = [];
  resumeWrites: Array<{ locale: Locale; envelope: TranslationEnvelope }> = [];
  constructor(private readonly resume: TranslatableResume | null) {
    super();
  }
  async load(): Promise<TranslatableResume | null> {
    return this.resume;
  }
  async saveItemTranslation(itemId: string, locale: Locale, envelope: TranslationEnvelope) {
    this.itemWrites.push({ itemId, locale, envelope });
  }
  async saveResumeTranslation(_resumeId: string, locale: Locale, envelope: TranslationEnvelope) {
    this.resumeWrites.push({ locale, envelope });
  }
}

class MemoryLedger extends TranslationCostLedgerPort {
  entries: TranslationCostEntry[] = [];
  constructor(private readonly spent: bigint = 0n) {
    super();
  }
  async record(entry: TranslationCostEntry) {
    this.entries.push(entry);
  }
  async monthToDateUsdMicros() {
    return this.spent;
  }
}

class MemoryProgress extends TranslationProgressPort {
  events: TranslationProgress[] = [];
  publish(_userId: string, progress: TranslationProgress) {
    this.events.push(progress);
  }
}

/** Uppercases every string leaf — a translator whose output is easy to assert on. */
function fakeLlm(available = true): TranslationLlmPort & { calls: number } {
  const upper = (v: JsonValue): JsonValue =>
    typeof v === 'string'
      ? v.toUpperCase()
      : Array.isArray(v)
        ? v.map(upper)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, upper(x)]))
          : v;
  const llm = {
    calls: 0,
    isAvailable: () => available,
    translateObject: mock(async <T extends JsonValue>(obj: T) => {
      llm.calls++;
      return {
        translated: upper(obj) as T,
        source: 'pt' as const,
        target: 'en' as const,
        tokensUsed: 100,
        cacheHit: false,
      };
    }),
    translate: mock(async () => {
      throw new Error('unused');
    }),
    translateBatch: mock(async () => {
      throw new Error('unused');
    }),
    detectLanguage: mock(async () => {
      throw new Error('unused');
    }),
  };
  return llm as unknown as TranslationLlmPort & { calls: number };
}

const flags = (on: boolean) => ({ isEnabled: async () => on }) as unknown as FeatureFlagService;

const WORK_FIELDS = [
  { key: 'role', semanticRole: SEMANTIC_ROLE.JOB_TITLE },
  { key: 'company', semanticRole: SEMANTIC_ROLE.ORGANIZATION },
  { key: 'description', semanticRole: SEMANTIC_ROLE.DESCRIPTION },
  { key: 'startDate', semanticRole: SEMANTIC_ROLE.START_DATE },
];

function resume(
  items: Array<{ id: string; content: Record<string, unknown>; translations?: unknown }>,
): TranslatableResume {
  return {
    id: 'r1',
    userId: 'u1',
    language: 'pt-BR',
    prose: { summary: 'Resumo em português', headline: null, jobTitle: null },
    translations: null,
    sections: [
      {
        sectionTypeKey: 'work_experience_v1',
        fields: WORK_FIELDS,
        items: items.map((i) => ({ ...i, translations: i.translations ?? null })),
      },
    ],
  };
}

function build(
  r: TranslatableResume | null,
  opts: {
    llm?: ReturnType<typeof fakeLlm>;
    flagOn?: boolean;
    spent?: bigint;
    cap?: bigint;
    price?: number;
  } = {},
) {
  const store = new MemoryStore(r);
  const ledger = new MemoryLedger(opts.spent ?? 0n);
  const progress = new MemoryProgress();
  const llm = opts.llm ?? fakeLlm();
  const useCase = new TranslateResumeIntoLocaleUseCase(
    store,
    llm,
    ledger,
    progress,
    flags(opts.flagOn ?? true),
    { priceUsdMicrosPer1kTokens: opts.price ?? 1000, monthlyCapUsdMicros: opts.cap ?? 1_000_000n },
    stubLogger,
    () => new Date('2026-09-03T00:00:00.000Z'),
  );
  return { useCase, store, ledger, progress, llm };
}

describe('TranslateResumeIntoLocaleUseCase', () => {
  it('translates only the fields the policy allows and stores the envelope with the source hash', async () => {
    const { useCase, store, llm } = build(
      resume([
        {
          id: 'i1',
          content: {
            role: 'Engenheira',
            company: 'Acme',
            description: 'Fiz coisas',
            startDate: '2022-03',
          },
        },
      ]),
    );
    const report = await useCase.execute('r1');

    expect(report.status).toBe('completed');
    expect(report.locale).toBe('en');
    expect(llm.calls).toBe(2); // one section + résumé prose
    const write = store.itemWrites[0]!;
    expect(write.locale).toBe('en');
    expect(write.envelope.data).toEqual({ role: 'ENGENHEIRA', description: 'FIZ COISAS' });
    expect(write.envelope.sourceHash).toBe(
      hashSource({ role: 'Engenheira', description: 'Fiz coisas' }),
    );
    expect(write.envelope.origin).toBe('derived');
    expect(store.resumeWrites[0]!.envelope.data).toEqual({ summary: 'RESUMO EM PORTUGUÊS' });
  });

  it('skips items whose canonical text has not changed since the last derivation', async () => {
    const content = { role: 'Engenheira', description: 'Fiz coisas' };
    const current: TranslationEnvelope = {
      data: { role: 'X', description: 'Y' },
      sourceHash: hashSource(content),
      translatedAt: 'earlier',
      origin: 'derived',
    };
    const { useCase, store, llm } = build(
      resume([{ id: 'i1', content, translations: { en: current } }]),
    );
    const report = await useCase.execute('r1');
    expect(report.itemsSkipped).toBe(1);
    expect(report.itemsTranslated).toBe(0);
    expect(store.itemWrites).toHaveLength(0);
    expect(llm.calls).toBe(1); // only the résumé prose
  });

  it('never overwrites a copy the person wrote (manual) or kept on purpose (diverged)', async () => {
    const mk = (origin: 'manual' | 'diverged'): TranslationEnvelope => ({
      data: { role: 'Mine' },
      sourceHash: 'stale-on-purpose',
      translatedAt: 'earlier',
      origin,
    });
    const { useCase, store } = build(
      resume([
        { id: 'manual', content: { role: 'A' }, translations: { en: mk('manual') } },
        { id: 'diverged', content: { role: 'B' }, translations: { en: mk('diverged') } },
      ]),
    );
    const report = await useCase.execute('r1', { force: true });
    expect(report.itemsSkipped).toBe(2);
    expect(store.itemWrites).toHaveLength(0);
  });

  it('does nothing when the flag is off, the provider is down, or the monthly cap is reached', async () => {
    const r = resume([{ id: 'i1', content: { role: 'Engenheira' } }]);
    for (const [label, opts] of [
      ['flag-off', { flagOn: false }],
      ['provider-unavailable', { llm: fakeLlm(false) }],
      ['monthly-cap', { spent: 1_000_000n }],
    ] as const) {
      const { useCase, store, progress } = build(r, opts);
      const report = await useCase.execute('r1');
      expect(report.status).toBe('skipped');
      expect(report.reason).toBe(label);
      expect(store.itemWrites).toHaveLength(0);
      expect(progress.events.at(-1)?.status).toBe('skipped');
    }
  });

  it('records tokens and cost per run and reports progress per section', async () => {
    const { useCase, ledger, progress } = build(
      resume([{ id: 'i1', content: { role: 'Engenheira' } }]),
      { price: 2000 },
    );
    const report = await useCase.execute('r1');
    expect(report.tokensUsed).toBe(200);
    expect(report.costUsdMicros).toBe(400n);
    expect(ledger.entries[0]).toMatchObject({
      userId: 'u1',
      resumeId: 'r1',
      locale: 'en',
      tokensUsed: 200,
    });
    expect(progress.events.map((e) => `${e.status}:${e.done}/${e.total}`)).toEqual([
      'running:0/2',
      'running:1/2',
      'completed:2/2',
    ]);
  });

  it('refuses to derive a résumé into its own language', async () => {
    const { useCase, llm } = build(resume([{ id: 'i1', content: { role: 'Engenheira' } }]));
    const report = await useCase.execute('r1', { locale: 'pt-BR' });
    expect(report.status).toBe('skipped');
    expect(llm.calls).toBe(0);
  });
});
