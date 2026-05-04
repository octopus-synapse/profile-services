import OpenAI from 'openai';
import { z } from 'zod';
import { LoggerPort } from '@/shared-kernel';
import { ConfigPort } from '@/shared-kernel/config';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import {
  AiEmptyInputException,
  AiEmptyResponseException,
  AiInvalidOutputException,
  AiNotConfiguredException,
} from '../../domain/exceptions/ai.exceptions';
import {
  type ExtractedJob,
  type ExtractedResume,
  LlmPort,
  type TailorResumeInput,
  type TailorResumeOutput,
} from '../../domain/ports/llm.port';
import { EXTRACT_JOB_SYSTEM_PROMPT } from '../../domain/prompts/extract-job.v1';
import { EXTRACT_RESUME_SYSTEM_PROMPT } from '../../domain/prompts/extract-resume.v1';
import {
  buildTailorResumeUserMessage,
  TAILOR_RESUME_SYSTEM_PROMPT,
} from '../../domain/prompts/tailor-resume.v1';

const TailorOutputSchema = z.object({
  summary: z.string().nullable(),
  jobTitle: z.string().nullable(),
  bullets: z
    .array(
      z.object({
        id: z.string(),
        original: z.string(),
        tailored: z.string(),
        highlights: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

const ExtractedJobSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  salaryRange: z.string().nullable(),
  applyUrl: z.string().nullable(),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).nullable(),
  remotePolicy: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).nullable(),
  paymentCurrency: z.enum(['BRL', 'USD', 'EUR', 'GBP']).nullable(),
  minEnglishLevel: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT']).nullable(),
});

const ExtractedResumeSchema = z.object({
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  summary: z.string().nullable(),
  skills: z.array(z.string()).default([]),
  experiences: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
        description: z.string().nullable(),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string().nullable(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
      }),
    )
    .default([]),
});

const CTX = 'OpenAIAdapter';

export class OpenAIAdapter extends LlmPort implements Lifecycle {
  private client!: OpenAI;
  private model!: string;
  private maxTokens!: number;

  constructor(
    private readonly config: ConfigPort,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async init(): Promise<void> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      // We don't throw at boot — the module is loaded even in environments
      // where AI features are disabled. Methods throw at call time instead.
      this.logger.warn(
        'OPENAI_API_KEY is not set — AI features will fail at call time until configured.',
        CTX,
      );
    }
    this.client = new OpenAI({ apiKey: apiKey ?? 'unset' });
    this.model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
    this.maxTokens = Number(this.config.get<string>('OPENAI_MAX_TOKENS') ?? '1500');
  }

  async tailorResume(input: TailorResumeInput): Promise<TailorResumeOutput> {
    this.assertConfigured();

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: TAILOR_RESUME_SYSTEM_PROMPT },
        { role: 'user', content: buildTailorResumeUserMessage(input) },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    if (!raw) {
      throw new AiEmptyResponseException('tailorResume');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      this.logger.error('Failed to JSON.parse OpenAI tailor response', { context: CTX, stack: raw });
      throw err;
    }

    const result = TailorOutputSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(`OpenAI tailor response failed schema validation: ${result.error.message}`, { context: CTX });
      throw new AiInvalidOutputException('tailorResume');
    }
    return result.data;
  }

  async extractResumeFromText(text: string): Promise<ExtractedResume> {
    this.assertConfigured();
    if (!text.trim()) {
      throw new AiEmptyInputException('extractResumeFromText');
    }
    // Guard against absurdly long inputs — most CVs fit easily. Trim conservatively.
    const trimmed = text.length > 40000 ? text.slice(0, 40000) : text;

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EXTRACT_RESUME_SYSTEM_PROMPT },
        { role: 'user', content: trimmed },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    if (!raw) throw new AiEmptyResponseException('extractResumeFromText');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      this.logger.error('Failed to JSON.parse OpenAI extract response', { context: CTX, stack: raw });
      throw err;
    }
    const result = ExtractedResumeSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(`OpenAI extract response failed schema validation: ${result.error.message}`, { context: CTX });
      throw new AiInvalidOutputException('extractResumeFromText');
    }
    return result.data;
  }

  async extractJobFromText(text: string): Promise<ExtractedJob> {
    this.assertConfigured();
    if (!text.trim()) {
      throw new AiEmptyInputException('extractJobFromText');
    }
    const trimmed = text.length > 30000 ? text.slice(0, 30000) : text;

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EXTRACT_JOB_SYSTEM_PROMPT },
        { role: 'user', content: trimmed },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    if (!raw) throw new AiEmptyResponseException('extractJobFromText');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      this.logger.error('Failed to JSON.parse OpenAI extract-job response', { context: CTX, stack: raw });
      throw err;
    }
    const result = ExtractedJobSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(`OpenAI extract-job response failed schema validation: ${result.error.message}`, { context: CTX });
      throw new AiInvalidOutputException('extractJobFromText');
    }
    return result.data;
  }

  private assertConfigured() {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new AiNotConfiguredException();
    }
  }
}
