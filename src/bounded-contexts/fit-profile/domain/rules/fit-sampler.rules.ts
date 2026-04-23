import {
  BIG_FIVE_DIMENSIONS,
  BLOCK_SAMPLE_COUNTS,
  type FitDimension,
  QUESTION_SET_SIZE,
  SCHWARTZ_DIMENSIONS,
  SDT_DIMENSIONS,
} from '../types';

/** Minimal question shape the sampler cares about — intentionally a
 * projection of the Prisma `FitQuestion` model so the rule layer never
 * touches the ORM. The use-case fetches all active questions and hands
 * them here as literals. */
export interface SampleableQuestion {
  readonly id: string;
  readonly dimension: FitDimension;
}

/**
 * Deterministic stratified sampler. Splits the 25-question budget
 * across the three psychometric blocks (Big Five / Schwartz / SDT)
 * using the ratios declared in `BLOCK_SAMPLE_COUNTS`, then fills each
 * block by rotating through its dimensions to avoid oversampling any
 * one dimension.
 *
 * The sampling is idempotent for a given `(seed, pool)` pair — the
 * same seed with the same pool produces exactly the same 25 question
 * IDs in the same order. That's what makes `FitQuestionSet.seed` work
 * as an idempotency key when the user refreshes the questionnaire
 * page before finishing.
 */
export function sampleQuestions(
  pool: readonly SampleableQuestion[],
  seed: string,
): readonly SampleableQuestion[] {
  const bigFive = sampleBlock(pool, BIG_FIVE_DIMENSIONS, BLOCK_SAMPLE_COUNTS.bigFive, `${seed}:bf`);
  const schwartz = sampleBlock(
    pool,
    SCHWARTZ_DIMENSIONS,
    BLOCK_SAMPLE_COUNTS.schwartz,
    `${seed}:sw`,
  );
  const sdt = sampleBlock(pool, SDT_DIMENSIONS, BLOCK_SAMPLE_COUNTS.sdt, `${seed}:sdt`);

  const combined = [...bigFive, ...schwartz, ...sdt];

  // Sanity: never return more than 25 even if a block had headroom.
  return combined.slice(0, QUESTION_SET_SIZE);
}

function sampleBlock(
  pool: readonly SampleableQuestion[],
  dimensions: readonly FitDimension[],
  count: number,
  blockSeed: string,
): readonly SampleableQuestion[] {
  // Group eligible questions by dimension — deterministic, no I/O.
  const byDimension = new Map<FitDimension, SampleableQuestion[]>();
  for (const dimension of dimensions) byDimension.set(dimension, []);
  for (const question of pool) {
    const bucket = byDimension.get(question.dimension);
    if (bucket) bucket.push(question);
  }

  // Shuffle each bucket with a per-dimension sub-seed so reshuffles
  // don't cascade across dimensions.
  for (const [dimension, bucket] of byDimension) {
    byDimension.set(dimension, seededShuffle(bucket, `${blockSeed}:${dimension}`));
  }

  // Round-robin across dimensions until we've picked `count` questions.
  const selected: SampleableQuestion[] = [];
  const cursors = new Map<FitDimension, number>();
  for (const dimension of dimensions) cursors.set(dimension, 0);

  // Many attempts = dimensions * worst-case bucket size. Stop as soon
  // as we have enough or we've exhausted every bucket.
  const maxRounds = pool.length + count;
  let round = 0;
  while (selected.length < count && round < maxRounds) {
    let progressed = false;
    for (const dimension of dimensions) {
      if (selected.length >= count) break;
      const bucket = byDimension.get(dimension) ?? [];
      const cursor = cursors.get(dimension) ?? 0;
      if (cursor < bucket.length) {
        const picked = bucket[cursor];
        if (picked) selected.push(picked);
        cursors.set(dimension, cursor + 1);
        progressed = true;
      }
    }
    if (!progressed) break;
    round += 1;
  }

  return selected;
}

/** Fisher–Yates shuffle driven by a deterministic PRNG (mulberry32 over
 * a fnv-1a hashed seed). Not cryptographically secure — we only need
 * reproducibility, not unpredictability. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const copy = items.slice();
  const rng = mulberry32(fnv1a(seed));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build the stable seed used for a given user's remap slot. The seed
 * combines user + generation so that successive remaps produce
 * different 25-question sets, but a retry mid-remap (generation unchanged)
 * returns the same set. */
export function buildQuestionSetSeed(userId: string, generation: number): string {
  return `fit:${userId}:gen${generation}`;
}
