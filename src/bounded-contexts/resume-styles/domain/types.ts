import { LayoutKind } from '@prisma/client';

export { LayoutKind };

/**
 * Minimum styleScore the validator demands on creation/update.
 * Every published `ResumeStyle` is ATS-safe by design: creation/update
 * below this is rejected (422 `STYLE_BELOW_ATS_THRESHOLD`). Configurable
 * via `ConfigService` later (env var `SCORING_STYLE_SCORE_MIN`);
 * hardcoded for now so the domain layer stays independent of the
 * platform module.
 */
export const STYLE_SCORE_MIN = 80;

/** Severity of a failed style criterion — mirrors `QualityIssue`. */
export type StyleIssueSeverity = 'high' | 'medium' | 'low';

/** Score buckets the rubric groups criteria under. Open string so the
 * data-driven catalog can introduce buckets without a code change. */
export type StyleBucket = 'structure' | 'typography' | 'contrast' | 'decorations' | (string & {});

/**
 * A single failed criterion, surfaced as an actionable explanation.
 * Emitted as raw data + `messageArgs` (no server-side localization) —
 * exactly like `QualityIssue` in resume-quality; the client renders the
 * message from the stable `code`.
 */
export interface StyleIssue {
  readonly code: string;
  readonly severity: StyleIssueSeverity;
  readonly bucket: StyleBucket;
  readonly messageArgs?: Record<string, string | number>;
}

/** Persisted breakdown for a scored style: awarded points per bucket +
 * the failed-criterion explanations. Stored in `ResumeStyle.styleScoreBreakdown`. */
export interface StyleScoreBreakdownData {
  readonly buckets: Readonly<Record<string, number>>;
  readonly issues: readonly StyleIssue[];
}

/** Input the scorer evaluates — the template's design config plus the
 * persisted `layoutKind` column (some criteria cross-check both). */
export interface StyleScoreInput {
  readonly styleConfig: Record<string, unknown>;
  readonly layoutKind: LayoutKind;
}

/** Result of scoring a style: overall 0-100, awarded points per bucket,
 * and the issues for every failed criterion. */
export interface StyleScoreResult {
  readonly overall: number;
  readonly breakdown: Readonly<Record<string, number>>;
  readonly issues: readonly StyleIssue[];
}

/** One tunable scoring criterion loaded from the data-driven catalog
 * (`StyleScoringCriterion` table). The evaluator function is code keyed
 * by `key`; weights / thresholds / allowlists live here so admins can
 * tune the rubric without a deploy. */
export interface StyleScoringCriterionDef {
  readonly key: string;
  readonly bucket: StyleBucket;
  readonly weight: number;
  readonly severity: StyleIssueSeverity;
  readonly params: Record<string, unknown>;
}

export interface StyleSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly styleScore: number;
  readonly layoutKind: LayoutKind;
  readonly typstTemplate: string;
  readonly isSystem: boolean;
  readonly thumbnailUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StyleDetail extends StyleSummary {
  readonly version: number;
  readonly styleConfig: Readonly<Record<string, unknown>>;
  readonly sectionStyles: Readonly<Record<string, unknown>>;
  readonly styleScoreBreakdown: StyleScoreBreakdownData;
  readonly previewImages: readonly string[];
  readonly authorId: string;
}

export interface CreateStyleInput {
  readonly name: string;
  readonly description?: string | null;
  readonly typstTemplate: string;
  readonly layoutKind: LayoutKind;
  readonly styleConfig: Record<string, unknown>;
  readonly sectionStyles?: Record<string, unknown>;
  readonly authorId: string;
}

export interface UpdateStylePatch {
  readonly name?: string;
  readonly description?: string | null;
  readonly typstTemplate?: string;
  readonly layoutKind?: LayoutKind;
  readonly styleConfig?: Record<string, unknown>;
  readonly sectionStyles?: Record<string, unknown>;
}
