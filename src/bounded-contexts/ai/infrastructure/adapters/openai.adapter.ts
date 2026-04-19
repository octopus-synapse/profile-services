import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  type ExtractedResume,
  LlmPort,
  type TailorResumeInput,
  type TailorResumeOutput,
} from '../../domain/ports/llm.port';
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

@Injectable()
export class OpenAIAdapter extends LlmPort implements OnModuleInit {
  private readonly logger = new Logger(OpenAIAdapter.name);
  private client!: OpenAI;
  private model!: string;
  private maxTokens!: number;

  constructor(private readonly config: ConfigService) {
    super();
  }

  onModuleInit(): void {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      // We don't throw at boot — the module is loaded even in environments
      // where AI features are disabled. Methods throw at call time instead.
      this.logger.warn(
        'OPENAI_API_KEY is not set — AI features will fail at call time until configured.',
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
      throw new Error('OpenAI returned an empty response for tailorResume');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      this.logger.error('Failed to JSON.parse OpenAI tailor response', raw);
      throw err;
    }

    const result = TailorOutputSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(`OpenAI tailor response failed schema validation: ${result.error.message}`);
      throw new Error('Invalid LLM output shape');
    }
    return result.data;
  }

  async extractResumeFromText(text: string): Promise<ExtractedResume> {
    this.assertConfigured();
    if (!text.trim()) {
      throw new Error('extractResumeFromText called with empty input');
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
    if (!raw) throw new Error('OpenAI returned an empty response for extractResumeFromText');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      this.logger.error('Failed to JSON.parse OpenAI extract response', raw);
      throw err;
    }
    const result = ExtractedResumeSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(
        `OpenAI extract response failed schema validation: ${result.error.message}`,
      );
      throw new Error('Invalid LLM extract output shape');
    }
    return result.data;
  }

  private assertConfigured() {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set; cannot call OpenAI.');
    }
  }
}
