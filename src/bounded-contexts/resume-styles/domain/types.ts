import { LayoutKind } from '@prisma/client';

export { LayoutKind };

/**
 * Minimum styleScore the validator demands on creation/update.
 * Plan invariant 3 — every published `ResumeStyle` is ATS-safe by
 * design. Configurable via `ConfigService` later (env var
 * `SCORING_ATS_SAFE_THRESHOLD`); hardcoded for the MVP so the
 * domain layer stays independent of the platform module.
 */
export const ATS_SAFE_THRESHOLD = 70;

export interface AtsSafetyBreakdown {
  readonly layout: number;
  readonly typography: number;
  readonly fileLevel: number;
  // Open shape — admins may add new buckets via the JSON column without
  // a code change, and we don't want the type system to gate that.
  readonly [key: string]: number;
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
  readonly atsSafetyBreakdown: AtsSafetyBreakdown;
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
