import type { CreateStyleInput, StyleDetail, StyleSummary, UpdateStylePatch } from '../types';

export interface ListStylesArgs {
  readonly page?: number;
  readonly limit?: number;
  readonly system?: boolean;
}

export interface PaginatedStyles {
  readonly items: readonly StyleSummary[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

export abstract class ResumeStyleRepositoryPort {
  abstract list(args?: ListStylesArgs): Promise<PaginatedStyles>;
  abstract findById(id: string): Promise<StyleDetail | null>;
  abstract create(
    input: CreateStyleInput & { styleScore: number; atsSafetyBreakdown: Record<string, number> },
  ): Promise<StyleDetail>;
  abstract update(
    id: string,
    patch: UpdateStylePatch & { styleScore?: number; atsSafetyBreakdown?: Record<string, number> },
  ): Promise<StyleDetail>;
  abstract delete(id: string): Promise<void>;
  /**
   * Atomically points `Resume.styleId` at the given style. Returns
   * `false` when no resume matches `(id = resumeId, userId = userId)`
   * — covers both "resume doesn't exist" and "caller isn't the owner",
   * which collapse to the same 404 from the user's perspective.
   */
  abstract applyToResume(resumeId: string, styleId: string, userId: string): Promise<boolean>;
}
