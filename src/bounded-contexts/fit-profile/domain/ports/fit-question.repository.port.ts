import type { FitDimension, FitScaleType } from '../types';

/** Domain-shaped FitQuestion — no Prisma Decimal leaks. `weight` is a
 * plain `number` at the domain boundary since all math downstream
 * operates on JS floats. */
export interface FitQuestionRecord {
  readonly id: string;
  readonly key: string;
  readonly dimension: FitDimension;
  readonly textEn: string;
  readonly textPtBr: string;
  readonly scaleType: FitScaleType;
  readonly weight: number;
  readonly isActive: boolean;
  /** Some Big Five items are written inverted ("I get stressed easily"
   * for Neuroticism). The seed encodes the polarity via a suffix on
   * the `key` — we surface it as an explicit boolean here so the
   * vectoriser never parses strings. Optional (default false) so the
   * repository is free to leave legacy rows alone. */
  readonly reverseScored?: boolean;
}

export interface FitQuestionInput {
  readonly key: string;
  readonly dimension: FitDimension;
  readonly textEn: string;
  readonly textPtBr: string;
  readonly scaleType: FitScaleType;
  readonly weight: number;
  readonly isActive?: boolean;
  readonly reverseScored?: boolean;
}

export interface FitQuestionPatch {
  readonly textEn?: string;
  readonly textPtBr?: string;
  readonly scaleType?: FitScaleType;
  readonly weight?: number;
  readonly isActive?: boolean;
  readonly reverseScored?: boolean;
  readonly dimension?: FitDimension;
}

export abstract class FitQuestionRepositoryPort {
  abstract listActive(): Promise<readonly FitQuestionRecord[]>;
  abstract listAll(): Promise<readonly FitQuestionRecord[]>;
  abstract findById(id: string): Promise<FitQuestionRecord | null>;
  abstract findManyByIds(ids: readonly string[]): Promise<readonly FitQuestionRecord[]>;
  abstract create(input: FitQuestionInput): Promise<FitQuestionRecord>;
  abstract update(id: string, patch: FitQuestionPatch): Promise<FitQuestionRecord>;
  abstract delete(id: string): Promise<void>;
}
