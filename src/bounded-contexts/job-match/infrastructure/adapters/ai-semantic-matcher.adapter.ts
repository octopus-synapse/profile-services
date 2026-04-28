import type { EmbeddingsPort } from '@/bounded-contexts/ai/domain/ports/embeddings.port';
import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import {
  SemanticMatcherPort,
  type SemanticMatchInput,
  type SemanticMatchResult,
} from '../../domain/ports/semantic-matcher.port';

const SEMANTIC_FLAG = 'scoring.match.semantic.enabled';
const EMBEDDING_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Real Semantic Matcher — embeds the resume summary and the job
 * description, then reports cosine similarity mapped to 0..100.
 *
 * Sub-computation caching per the plan:
 * - Resume and JD embeddings are cached independently so an edit to
 *   one side reuses the other. Cache keys include a short fingerprint
 *   of the text content so a full 7d TTL is safe — the invalidation
 *   happens via the cache-key changing, not a wall-clock eviction.
 *
 * Kill-switch: `scoring.match.semantic.enabled`. Flag off → null score
 * → blender drops the sub-score and reallocates the weights.
 */
export class AiSemanticMatcherAdapter extends SemanticMatcherPort {
  constructor(
    private readonly embeddings: EmbeddingsPort,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async match(input: SemanticMatchInput): Promise<SemanticMatchResult> {
    if (!(await this.flags.isEnabled(SEMANTIC_FLAG, null))) {
      return { score: null };
    }

    try {
      const [resumeText, jobText] = await Promise.all([
        this.loadResumeText(input.resumeId),
        this.loadJobText(input.jobId),
      ]);
      if (!resumeText || !jobText) return { score: null };

      const [resumeVec, jobVec] = await Promise.all([
        this.embedCached('resume', input.resumeId, resumeText),
        this.embedCached('job', input.jobId, jobText),
      ]);

      const similarity = cosineSimilarity(resumeVec, jobVec);
      // Map cosine ∈ [-1, 1] → [0, 100]. OpenAI small stays ≥ 0 on
      // unrelated technical text, so clamping the low end is safe.
      const score = Math.round(Math.max(0, Math.min(1, (similarity + 1) / 2)) * 100);
      return { score };
    } catch (err) {
      this.logger.warn(
        `Semantic match failed: ${(err as Error).message}`,
        'AiSemanticMatcherAdapter',
      );
      return { score: null };
    }
  }

  private async loadResumeText(resumeId: string): Promise<string | null> {
    const row = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { summary: true, jobTitle: true, primaryStack: true },
    });
    if (!row) return null;
    const parts = [row.jobTitle, row.summary, (row.primaryStack ?? []).join(', ')]
      .filter((p) => typeof p === 'string' && p.trim().length > 0)
      .join('\n\n');
    return parts || null;
  }

  private async loadJobText(jobId: string): Promise<string | null> {
    const row = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { title: true, description: true, skills: true, requirements: true },
    });
    if (!row) return null;
    const parts = [
      row.title,
      row.description,
      (row.skills ?? []).join(', '),
      (row.requirements ?? []).join('\n'),
    ]
      .filter((p) => typeof p === 'string' && p.trim().length > 0)
      .join('\n\n');
    return parts || null;
  }

  private async embedCached(
    kind: 'resume' | 'job',
    id: string,
    text: string,
  ): Promise<readonly number[]> {
    const cacheKey = `ai:embedding:${kind}:${id}:${shortHash(text)}`;
    const hit = await this.cache.get<number[]>(cacheKey);
    if (hit) return hit;
    const result = await this.embeddings.embed(text);
    await this.cache.set(cacheKey, result.vector, EMBEDDING_TTL_SECONDS).catch(() => {});
    return result.vector;
  }
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function shortHash(text: string): string {
  // Non-crypto fnv-1a 32-bit. Good enough to tag a cache key with the
  // content it's for; collisions yield stale embeddings, not security
  // risks, and the 7d TTL caps exposure on those anyway.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
