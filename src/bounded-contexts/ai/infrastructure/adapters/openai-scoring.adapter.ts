import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  AiEmptyResponseException,
  AiInvalidOutputException,
  AiNotConfiguredException,
} from '../../domain/exceptions/ai.exceptions';
import {
  type ContentQualityInput,
  type ContentQualityResult,
  type NormalizedRequirementsResult,
  type NormalizeRequirementsInput,
  ScoringLlmPort,
} from '../../domain/ports/scoring-llm.port';
import {
  ANALYZE_CONTENT_QUALITY_SYSTEM_PROMPT,
  buildAnalyzeContentQualityUserMessage,
} from '../../domain/prompts/analyze-content-quality.v1';
import {
  buildNormalizeRequirementsUserMessage,
  NORMALIZE_REQUIREMENTS_SYSTEM_PROMPT,
} from '../../domain/prompts/normalize-requirements.v1';

const ContentQualityOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  issues: z
    .array(
      z.object({
        code: z.enum(['VAGUE_BULLET', 'NO_METRIC', 'WEAK_VERB', 'OTHER']),
        severity: z.enum(['low', 'medium', 'high']),
        freeformMessage: z.string().max(400),
        context: z
          .object({ bulletId: z.string().optional(), excerpt: z.string().max(240).optional() })
          .optional(),
      }),
    )
    .max(10)
    .default([]),
});

const NormalizedRequirementsOutputSchema = z.object({
  minYears: z.number().int().min(0).max(60).nullable().default(null),
  languages: z
    .array(
      z.object({
        language: z.string(),
        cefr: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).nullable(),
      }),
    )
    .default([]),
  certifications: z.array(z.string()).default([]),
  seniority: z.enum(['junior', 'mid', 'senior', 'staff', 'principal']).nullable().default(null),
});

/**
 * OpenAI adapter for the Scoring-specific LLM operations (Content
 * Quality analyser + Requirements normaliser). Mirrors the structure
 * of `OpenAIAdapter` (which handles tailor/extract) intentionally —
 * consistent error paths, Zod validation with a single retry on
 * schema-miss, JSON response mode.
 *
 * Kept separate from `OpenAIAdapter` so the cost/logging hooks can
 * evolve independently per workload (content quality runs per resume
 * save; tailor runs per job apply).
 */
@Injectable()
export class OpenAIScoringAdapter extends ScoringLlmPort {
  private readonly logger = new Logger(OpenAIScoringAdapter.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(private readonly config: ConfigService) {
    super();
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.client = new OpenAI({ apiKey: apiKey ?? 'unset' });
    this.model = this.config.get<string>('OPENAI_SCORING_MODEL') ?? 'gpt-4o-mini';
    this.maxTokens = Number(this.config.get<string>('OPENAI_SCORING_MAX_TOKENS') ?? '1200');
  }

  async analyzeContentQuality(input: ContentQualityInput): Promise<ContentQualityResult> {
    this.assertConfigured();
    const baseMessages = [
      { role: 'system' as const, content: ANALYZE_CONTENT_QUALITY_SYSTEM_PROMPT },
      { role: 'user' as const, content: buildAnalyzeContentQualityUserMessage(input) },
    ];
    const { data, tokensUsed } = await this.callWithRetry(
      'analyzeContentQuality',
      baseMessages,
      ContentQualityOutputSchema,
      0.1,
    );
    return { score: data.score, issues: data.issues, tokensUsed };
  }

  async normalizeRequirements(
    input: NormalizeRequirementsInput,
  ): Promise<NormalizedRequirementsResult> {
    this.assertConfigured();
    const baseMessages = [
      { role: 'system' as const, content: NORMALIZE_REQUIREMENTS_SYSTEM_PROMPT },
      { role: 'user' as const, content: buildNormalizeRequirementsUserMessage(input) },
    ];
    const { data, tokensUsed } = await this.callWithRetry(
      'normalizeRequirements',
      baseMessages,
      NormalizedRequirementsOutputSchema,
      0,
    );
    return {
      minYears: data.minYears,
      languages: data.languages,
      certifications: data.certifications,
      seniority: data.seniority,
      tokensUsed,
    };
  }

  /**
   * One-shot retry on schema-miss. The first call uses the user
   * prompt as-is; on failure we re-issue with an extra `system`
   * message describing the validator's complaint so the model can
   * self-correct without human intervention. After the second
   * failure we throw — callers map that to graceful degradation
   * (`null` score) so the user never sees a 500.
   */
  private async callWithRetry<T>(
    operation: string,
    baseMessages: ReadonlyArray<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    schema: {
      safeParse: (
        v: unknown,
      ) => { success: true; data: T } | { success: false; error: { message: string } };
    },
    temperature: number,
  ): Promise<{ data: T; tokensUsed: number }> {
    let lastError = '';
    let totalTokens = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const messages =
        attempt === 0
          ? [...baseMessages]
          : [
              ...baseMessages,
              {
                role: 'system' as const,
                content: `Your previous response failed schema validation: ${lastError}. Return strictly valid JSON matching the schema, with no extra prose.`,
              },
            ];
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature,
        response_format: { type: 'json_object' },
        messages,
      });
      totalTokens += response.usage?.total_tokens ?? 0;
      const raw = response.choices[0]?.message?.content;
      if (!raw) {
        if (attempt === 1) throw new AiEmptyResponseException(operation);
        lastError = 'response was empty';
        continue;
      }
      const parsed = this.parseJson(raw, operation);
      const result = schema.safeParse(parsed);
      if (result.success) return { data: result.data, tokensUsed: totalTokens };
      lastError = result.error.message.slice(0, 500);
      this.logger.warn(
        `${operation} schema validation failed (attempt ${attempt + 1}/2): ${lastError}`,
      );
    }
    throw new AiInvalidOutputException(operation);
  }

  private parseJson(raw: string, operation: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      this.logger.warn(`OpenAI ${operation} returned non-JSON payload`);
      // The retry loop wants a structured rejection it can read; let
      // the validator catch the empty object and trigger the second
      // attempt with the "invalid JSON" complaint baked in.
      return {};
    }
  }

  private assertConfigured(): void {
    if (!this.config.get<string>('OPENAI_API_KEY')) {
      throw new AiNotConfiguredException();
    }
  }
}
