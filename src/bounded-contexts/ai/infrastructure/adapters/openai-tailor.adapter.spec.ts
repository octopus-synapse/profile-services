/**
 * Spec: extracting `runTailor` to support the dev-only prompt lab must not have
 * changed the production request by one byte, and the debug surface must report
 * what actually went out.
 *
 * The OpenAI client is replaced with a recorder, so these assertions are about
 * the exact request object the adapter builds.
 */

import { describe, expect, it } from 'bun:test';
import type { ConfigPort } from '@/shared-kernel/config';
import type { LoggerPort } from '@/shared-kernel/logger';
import type { TailorResumeInput } from '../../domain/ports/llm.port';
import { TAILOR_RESUME_SYSTEM_PROMPT } from '../../domain/prompts/tailor-resume.v1';
import { OpenAIAdapter } from './openai.adapter';

const ENV: Record<string, string> = {
  OPENAI_API_KEY: 'test-key',
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_MAX_TOKENS: '1500',
  OPENAI_TAILOR_PRICE_USD_MICROS_PER_1K_TOKENS: '400',
};

const config = { get: (k: string) => ENV[k] } as unknown as ConfigPort;
const logger = {
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
} as unknown as LoggerPort;

const INPUT: TailorResumeInput = {
  resume: { summary: 's', jobTitle: 'Dev', primaryStack: ['ts'], sections: [] },
  job: { title: 'Dev', company: 'Acme', description: 'd', requirements: [], skills: [] },
};

const ANSWER = JSON.stringify({
  summary: 'rewritten',
  jobTitle: null,
  bullets: [{ id: 'b1', original: 'a', tailored: 'b', highlights: ['ts'] }],
});

/** Captures the request and replays a canned, schema-valid completion. */
async function withRecorder(
  fn: (adapter: OpenAIAdapter) => Promise<void>,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined = {
    prompt_tokens: 900,
    completion_tokens: 100,
    total_tokens: 1000,
  },
): Promise<Record<string, unknown>> {
  const adapter = new OpenAIAdapter(config, logger);
  await adapter.init();
  let seen: Record<string, unknown> = {};
  (adapter as unknown as { client: unknown }).client = {
    chat: {
      completions: {
        create: async (req: Record<string, unknown>) => {
          seen = req;
          return {
            choices: [{ message: { content: ANSWER }, finish_reason: 'stop' }],
            usage,
          };
        },
      },
    },
  };
  await fn(adapter);
  return seen;
}

describe('OpenAIAdapter.tailorResume — production path', () => {
  it('sends the production model, temperature, budget and prompt', async () => {
    const req = await withRecorder(async (adapter) => {
      await adapter.tailorResume(INPUT);
    });

    expect(req.model).toBe('gpt-4o-mini');
    expect(req.temperature).toBe(0.2);
    expect(req.max_tokens).toBe(1500);
    expect(req.response_format).toEqual({ type: 'json_object' });

    const messages = req.messages as Array<{ role: string; content: string }>;
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: 'system', content: TAILOR_RESUME_SYSTEM_PROMPT });
    expect(messages[1]?.role).toBe('user');
    expect(messages[1]?.content).toStartWith('<user_input>');
  });

  it('returns the parsed output only — no debug envelope', async () => {
    const adapter = new OpenAIAdapter(config, logger);
    await adapter.init();
    (adapter as unknown as { client: unknown }).client = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: ANSWER }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        },
      },
    };
    const out = await adapter.tailorResume(INPUT);
    expect(out.summary).toBe('rewritten');
    expect(out.bullets).toHaveLength(1);
    expect(out).not.toHaveProperty('debug');
  });
});

describe('OpenAIAdapter.tailorResumeDebug — dev-lab path', () => {
  it('applies every override', async () => {
    const req = await withRecorder(async (adapter) => {
      await adapter.tailorResumeDebug(INPUT, {
        model: 'gpt-4o',
        temperature: 1.25,
        maxTokens: 4000,
        systemPrompt: 'CUSTOM PROMPT',
      });
    });

    expect(req.model).toBe('gpt-4o');
    expect(req.temperature).toBe(1.25);
    expect(req.max_tokens).toBe(4000);
    const messages = req.messages as Array<{ role: string; content: string }>;
    expect(messages[0]?.content).toBe('CUSTOM PROMPT');
  });

  it('falls back to the production values when overrides are absent', async () => {
    const req = await withRecorder(async (adapter) => {
      await adapter.tailorResumeDebug(INPUT, {});
    });
    expect(req.model).toBe('gpt-4o-mini');
    expect(req.temperature).toBe(0.2);
    expect(req.max_tokens).toBe(1500);
  });

  it('reports usage, latency and cost as JSON-safe numbers', async () => {
    const adapter = new OpenAIAdapter(config, logger);
    await adapter.init();
    (adapter as unknown as { client: unknown }).client = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: ANSWER }, finish_reason: 'length' }],
            usage: { prompt_tokens: 900, completion_tokens: 100, total_tokens: 1000 },
          }),
        },
      },
    };

    const { debug } = await adapter.tailorResumeDebug(INPUT);
    expect(debug.promptTokens).toBe(900);
    expect(debug.completionTokens).toBe(100);
    expect(debug.totalTokens).toBe(1000);
    expect(debug.finishReason).toBe('length');
    // 1000 tokens × 400 micros per 1k.
    expect(debug.costUsdMicros).toBe(400);
    expect(typeof debug.costUsdMicros).toBe('number');
    expect(debug.latencyMs).toBeGreaterThanOrEqual(0);
    expect(debug.systemPrompt).toBe(TAILOR_RESUME_SYSTEM_PROMPT);
    expect(debug.userMessage).toStartWith('<user_input>');
    expect(debug.responseRaw).toBe(ANSWER);
    // Must survive the trip to the lab page.
    expect(() => JSON.stringify(debug)).not.toThrow();
  });

  it('survives a provider that omits usage', async () => {
    const adapter = new OpenAIAdapter(config, logger);
    await adapter.init();
    (adapter as unknown as { client: unknown }).client = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: ANSWER }, finish_reason: 'stop' }],
          }),
        },
      },
    };
    const { debug } = await adapter.tailorResumeDebug(INPUT);
    expect(debug.totalTokens).toBe(0);
    expect(debug.costUsdMicros).toBe(0);
  });

  it('exposes the production prompt for the lab editor', () => {
    const adapter = new OpenAIAdapter(config, logger);
    expect(adapter.defaultSystemPrompt).toBe(TAILOR_RESUME_SYSTEM_PROMPT);
  });
});
