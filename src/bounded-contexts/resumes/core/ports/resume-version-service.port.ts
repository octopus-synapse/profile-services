/**
 * Resume Version Service Port
 *
 * Abstract port for ResumeVersionService - enables dependency inversion.
 * Used by ResumesService for creating snapshots before updates.
 */

export abstract class ResumeVersionServicePort {
  abstract createSnapshot(resumeId: string, label?: string): Promise<void>;

  abstract getVersions(
    resumeId: string,
    userId: string,
  ): Promise<
    Array<{
      id: string;
      versionNumber: number;
      label: string | null;
      createdAt: Date;
    }>
  >;

  abstract restoreVersion(
    resumeId: string,
    versionId: string,
    userId: string,
  ): Promise<{ restoredFrom: Date }>;
}
