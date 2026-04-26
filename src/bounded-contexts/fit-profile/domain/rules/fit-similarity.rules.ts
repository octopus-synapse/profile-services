import {
  BIG_FIVE_DIMENSIONS,
  type FitDimension,
  type FitVector,
  SCHWARTZ_DIMENSIONS,
  SDT_DIMENSIONS,
  SIMILARITY_BLOCK_WEIGHTS,
} from '../types';

/** Treat both sides as if they lived on the [-1,+1] axis centred at
 * the neutral 0.5. That centering lets cosine similarity actually
 * discriminate — two all-`0.5` vectors (total ambivalence) are
 * neutrally similar rather than spuriously "identical" which is what
 * raw cosine on [0,1] values would claim. */
function centre(v: number): number {
  return v * 2 - 1;
}

/** Pairwise cosine over two aligned numeric arrays, skipping positions
 * where either side is missing. Returns `null` when no dimension in
 * the block has data on both sides — the caller can then fall back to
 * a neutral similarity or skip the block entirely. */
function cosineOnBlock(
  a: FitVector[keyof FitVector],
  b: FitVector[keyof FitVector],
  dimensions: readonly FitDimension[],
): number | null {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  let overlapping = 0;

  for (const dimension of dimensions) {
    const av = (a as Partial<Record<FitDimension, number>>)[dimension];
    const bv = (b as Partial<Record<FitDimension, number>>)[dimension];
    if (av === undefined || bv === undefined) continue;
    const ac = centre(av);
    const bc = centre(bv);
    dot += ac * bc;
    normA += ac * ac;
    normB += bc * bc;
    overlapping += 1;
  }

  if (overlapping === 0) return null;
  if (normA === 0 && normB === 0) return 1; // both exactly neutral → identical
  if (normA === 0 || normB === 0) return 0; // one side is flat neutral, other is not → neutral

  const cos = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  // Cosine is bound to [-1,1]; clamp small floating noise.
  return Math.max(-1, Math.min(1, cos));
}

/** Map a cosine similarity (-1..+1) to the product 0..100 score we
 * present to recruiters. -1 → 0, 0 → 50, +1 → 100. */
export function cosineToScore(cosine: number): number {
  return Math.round(((cosine + 1) / 2) * 100);
}

/**
 * Weighted cosine over the three psychometric blocks. Each block's
 * cosine contributes proportional to `SIMILARITY_BLOCK_WEIGHTS`. When
 * a block has no overlapping data, its weight is reassigned to
 * the remaining blocks rather than penalising the score — missing
 * data should not be indistinguishable from dissimilarity.
 *
 * Returns a 0..100 score. If *no* block has overlap (both sides
 * completely empty), returns `null` so callers can decide whether to
 * degrade (use a neutral 50) or surface an error.
 */
export function weightedCosineScore(a: FitVector, b: FitVector): number | null {
  const blocks = [
    {
      cosine: cosineOnBlock(a.bigFive, b.bigFive, BIG_FIVE_DIMENSIONS),
      weight: SIMILARITY_BLOCK_WEIGHTS.bigFive,
    },
    {
      cosine: cosineOnBlock(a.schwartz, b.schwartz, SCHWARTZ_DIMENSIONS),
      weight: SIMILARITY_BLOCK_WEIGHTS.schwartz,
    },
    { cosine: cosineOnBlock(a.sdt, b.sdt, SDT_DIMENSIONS), weight: SIMILARITY_BLOCK_WEIGHTS.sdt },
  ];

  const live = blocks.filter((b): b is { cosine: number; weight: number } => b.cosine !== null);
  if (live.length === 0) return null;

  const totalWeight = live.reduce((sum, b) => sum + b.weight, 0);
  const weighted = live.reduce((sum, b) => sum + b.cosine * b.weight, 0);
  const cosine = weighted / totalWeight;

  return cosineToScore(cosine);
}
