/**
 * Resume Config Repository Port
 *
 * Abstraction for resume style configuration operations.
 */

export interface ResumeConfig {
  sections: Array<{
    id: string;
    visible: boolean;
    order: number;
    column: string;
  }>;
  itemOverrides: Record<string, Array<{ itemId: string; visible: boolean; order: number }>>;
  [key: string]: unknown;
}

export abstract class ResumeConfigRepositoryPort {
  abstract get(userId: string, resumeId: string): Promise<ResumeConfig>;
  abstract save(resumeId: string, config: ResumeConfig): Promise<void>;
  abstract reorderSectionDirect(
    resumeId: string,
    sectionTypeKey: string,
    newOrder: number,
  ): Promise<void>;
  abstract batchUpdateSectionsDirect(
    resumeId: string,
    updates: Array<{ id: string; order?: number; visible?: boolean }>,
  ): Promise<void>;
}
