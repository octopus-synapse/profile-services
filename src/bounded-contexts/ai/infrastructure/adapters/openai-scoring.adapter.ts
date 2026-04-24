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
          .object({
            bulletId: z.string().optional(),
            excerpt: z.string().max(240).optional(),
          })
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

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ANALYZE_CONTENT_QUALITY_SYSTEM_PROMPT },
        { role: 'user', content: buildAnalyzeContentQualityUserMessage(input) },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new AiEmptyResponseException('analyzeContentQuality');

    const parsed = this.parseJson(raw, 'analyzeContentQuality');
    const result = ContentQualityOutputSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(`analyzeContentQuality schema validation failed: ${result.error.message}`);
      throw new AiInvalidOutputException('analyzeContentQuality');
    }

    return {
      score: result.data.score,
      issues: result.data.issues,
      tokensUsed: response.usage?.total_tokens ?? 0,
    };
  }

  async normalizeRequirements(
    input: NormalizeRequirementsInput,
  ): Promise<NormalizedRequirementsResult> {
    this.assertConfigured();

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: NORMALIZE_REQUIREMENTS_SYSTEM_PROMPT },
        { role: 'user', content: buildNormalizeRequirementsUserMessage(input) },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new AiEmptyResponseException('normalizeRequirements');

    const parsed = this.parseJson(raw, 'normalizeRequirements');
    const result = NormalizedRequirementsOutputSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(`normalizeRequirements schema validation failed: ${result.error.message}`);
      throw new AiInvalidOutputException('normalizeRequirements');
    }

    return {
      minYears: result.data.minYears,
      languages: result.data.languages,
      certifications: result.data.certifications,
      seniority: result.data.seniority,
      tokensUsed: response.usage?.total_tokens ?? 0,
    };
  }

  private parseJson(raw: string, operation: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      this.logger.error(`OpenAI ${operation} returned non-JSON payload`);
      throw new AiInvalidOutputException(operation);
    }
  }

  private assertConfigured(): void {
    if (!this.config.get<string>('OPENAI_API_KEY')) {
      throw new AiNotConfiguredException();
    }
  }
}
