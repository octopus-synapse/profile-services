/**
 * Sync DTOs
 * Single Responsibility: Data Transfer Objects for sync operations
 */

export interface SyncResultDto {
  institutionsInserted: number;
  institutionsUpdated: number;
  coursesInserted: number;
  coursesUpdated: number;
  totalRowsProcessed: number;
  errorsCount: number;
}

export interface SyncStatusDto {
  isRunning: boolean;
  metadata: SyncMetadataDto | null;
  lastSync: SyncLogDto | null;
}

export interface SyncMetadataDto {
  lastSyncAt: string;
  lastSyncStatus: 'success' | 'failed' | 'partial';
  lastSyncDuration: number;
  totalInstitutions: number;
  totalCourses: number;
  triggeredBy: string;
}

export interface SyncLogDto {
  id: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  institutionsInserted: number | null;
  coursesInserted: number | null;
  errorMessage: string | null;
}
