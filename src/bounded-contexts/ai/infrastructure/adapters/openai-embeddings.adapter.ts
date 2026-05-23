import OpenAI from 'openai';
import { LoggerPort } from '@/shared-kernel';
import { ConfigPort } from '@/shared-kernel/config';
import {
  AiEmptyInputException,
  AiNotConfiguredException,
} from '../../domain/exceptions/ai.exceptions';
import { EmbeddingsPort, type EmbeddingsResult } from '../../domain/ports/embeddings.port';

const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * OpenAI-backed embeddings adapter — targets `text-embedding-3-small`
 * per the scoring plan (1536 dims, cheap, strong-enough for
 * CV↔JD relevance).
 *
 * The adapter leaves caching to the caller: the Semantic Matcher
 * hashes its input once and checks Redis before entering this adapter.
 * That keeps the embeddings surface pure and makes it trivial to swap
 * providers without rewriting cache logic.
 */
export class OpenAIEmbeddingsAdapter extends EmbeddingsPort {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(
    private readonly config: ConfigPort,
    private readonly logger: LoggerPort,
  ) {
    super();
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    // P1-076 — same 60s ceiling as the chat adapter; embeddings are
    // typically faster (200-500ms) but the timeout is the right
    // guardrail for an unresponsive endpoint.
    this.client = new OpenAI({ apiKey: apiKey ?? 'unset', timeout: 60_000, maxRetries: 0 });
    this.model = this.config.get<string>('OPENAI_EMBEDDING_MODEL') ?? EMBEDDING_MODEL;
  }

  async embed(text: string): Promise<EmbeddingsResult> {
    this.assertConfigured();
    const trimmed = text.trim();
    if (!trimmed) throw new AiEmptyInputException('embed');

    const response = await this.client.embeddings.create({ model: this.model, input: trimmed });
    const first = response.data[0];
    if (!first) throw new Error('openai embeddings returned no data');
    return { vector: first.embedding, tokensUsed: response.usage.total_tokens };
  }

  async embedMany(texts: readonly string[]): Promise<readonly EmbeddingsResult[]> {
    this.assertConfigured();
    const filtered = texts.map((t) => t.trim()).filter((t) => t.length > 0);
    if (filtered.length === 0) return [];

    const response = await this.client.embeddings.create({
      model: this.model,
      input: filtered as string[],
    });
    // OpenAI charges the same per token whether batched or not, but the
    // HTTP overhead (and cold-start latency) disappears in the batched
    // variant. We attribute the total batch token usage to the first
    // result — callers that care about per-item attribution should call
    // `embed` serially instead.
    return response.data.map((item, idx) => ({
      vector: item.embedding,
      tokensUsed: idx === 0 ? response.usage.total_tokens : 0,
    }));
  }

  private assertConfigured(): void {
    if (!this.config.get<string>('OPENAI_API_KEY')) {
      throw new AiNotConfiguredException();
    }
  }
}
