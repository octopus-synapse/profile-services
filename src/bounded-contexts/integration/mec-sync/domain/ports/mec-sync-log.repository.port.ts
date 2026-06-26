/**
 * Outbound port for the sync-log table. Used by the orchestrator to
 * track the current run (RUNNING / SUCCESS / FAILED) and by the
 * internal API to surface history + last-status to operators.
 */

import type { MecSyncLog } from '@prisma/client';

export interface CreateSyncLogParams {
  triggeredBy: string;
}

export interface CompleteSyncLogParams {
  institutionsInserted: number;
  institutionsUpdated: number;
  coursesInserted: number;
  coursesUpdated: number;
  totalRowsProcessed: number;
  sourceFileSize: number;
}

export interface FailSyncLogParams {
  errorMessage: string;
  errorDetails?: Record<string, unknown>;
}

/**
 * Adapters return the persisted row directly — it IS Prisma's `MecSyncLog`
 * model. Controllers serialize via the flexible passthrough schema.
 */
export type SyncLogRow = MecSyncLog;

export abstract class MecSyncLogRepositoryPort {
  abstract create(params: CreateSyncLogParams): Promise<SyncLogRow>;
  abstract markSuccess(id: string, params: CompleteSyncLogParams): Promise<SyncLogRow>;
  abstract markFailed(id: string, params: FailSyncLogParams): Promise<SyncLogRow>;
  abstract findLast(): Promise<SyncLogRow | null>;
  abstract findHistory(limit: number): Promise<SyncLogRow[]>;
}
