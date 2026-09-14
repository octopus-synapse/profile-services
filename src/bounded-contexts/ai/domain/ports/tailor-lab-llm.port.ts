/**
 * Tailor-lab LLM port — the debuggable variant of `LlmPort.tailorResume`.
 *
 * DEV-ONLY SURFACE. Exists so the prompt lab (`platform/dev-lab`) can vary the
 * model, temperature and system prompt per request and read back what was
 * actually sent plus token/latency/cost telemetry. The production path
 * (`LlmPort.tailorResume`) deliberately keeps none of this: no overrides means
 * no prompt-injection vector permanently wired into the production call.
 *
 * Declared as an `interface` rather than an `abstract class` because
 * `OpenAIAdapter` already extends `LlmPort` and TypeScript allows one base
 * class only — the adapter `implements` this alongside it.
 */

import type { TailorResumeInput, TailorResumeOutput } from './llm.port';

/** Per-request overrides. Every field omitted ⇒ identical to production. */
export interface TailorResumeOverrides {
  /** Model id, e.g. `gpt-4o-mini`. Defaults to `OPENAI_MODEL`. */
  readonly model?: string;
  /** Sampling temperature. Defaults to the production constant (0.2). */
  readonly temperature?: number;
  /** Response budget. Defaults to `OPENAI_MAX_TOKENS`. */
  readonly maxTokens?: number;
  /** Replaces `TAILOR_RESUME_SYSTEM_PROMPT` for this call only. */
  readonly systemPrompt?: string;
}

/** Everything the lab needs to judge a run — what went out, what came back. */
export interface TailorResumeDebug {
  /** The system message as sent (the override, or the production prompt). */
  readonly systemPrompt: string;
  /** The user message as sent, including the `<user_input>` wrapper. */
  readonly userMessage: string;
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  /** Wall-clock of the OpenAI call alone, in milliseconds. */
  readonly latencyMs: number;
  /**
   * Estimated spend in USD micros. A plain `number` on purpose: the Prisma-bound
   * precedent uses `bigint`, which `JSON.stringify` throws on.
   */
  readonly costUsdMicros: number;
  /** `length` here means the output was truncated — not a bad prompt. */
  readonly finishReason: string | null;
  /** Raw assistant content, so a schema failure is inspectable in the lab. */
  readonly responseRaw: string;
}

export interface TailorLabLlmPort {
  /**
   * The system prompt production uses. Exposed here so a consumer can pre-fill
   * an editor with it (and offer "restore default") without reaching into the
   * ai BC's `domain/prompts/` — which cross-BC isolation forbids, and rightly:
   * the prompt is this port's business, not a shared constant.
   */
  readonly defaultSystemPrompt: string;

  /** Same call as `tailorResume`, with overrides applied and telemetry kept. */
  tailorResumeDebug(
    input: TailorResumeInput,
    overrides?: TailorResumeOverrides,
  ): Promise<{ output: TailorResumeOutput; debug: TailorResumeDebug }>;
}
