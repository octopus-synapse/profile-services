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
   * `false` when the resume id was not found so the caller can map
   * to a 404. Caller is responsible for ownership/authorisation.
   */
  abstract applyToResume(resumeId: string, styleId: string): Promise<boolean>;
}
