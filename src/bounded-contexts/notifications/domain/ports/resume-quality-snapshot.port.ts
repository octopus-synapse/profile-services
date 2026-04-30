/**
 * Outbound port for the read side of the resume-quality rank handler.
 * Returns the two most recent score snapshots so the use case can
 * detect a rank-boundary crossing, plus the resume's owning user id.
 */

export interface ResumeQualitySnapshot {
  readonly overallScore: number;
  readonly computedAt: Date;
}

export abstract class ResumeQualitySnapshotPort {
  abstract findRecentSnapshots(resumeId: string, take: number): Promise<ResumeQualitySnapshot[]>;
  abstract findResumeOwnerId(resumeId: string): Promise<string | null>;
}
