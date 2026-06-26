/**
 * In-memory `MecSyncLogRepositoryPort`. Captures every state transition
 * (RUNNING → SUCCESS/FAILED) so specs can assert on the audit trail.
 */

import { MecSyncStatus } from '@prisma/client';
import {
  type CompleteSyncLogParams,
  type CreateSyncLogParams,
  type FailSyncLogParams,
  MecSyncLogRepositoryPort,
  type SyncLogRow,
} from '../domain/ports/mec-sync-log.repository.port';

/** Build a full `MecSyncLog` row with column defaults; specs override the
 *  fields they assert on. Keeping every column here lets the fake satisfy
 *  the real row type instead of a cast escape. */
function buildRow(overrides: Partial<SyncLogRow> & { id: string }): SyncLogRow {
  return {
    status: MecSyncStatus.RUNNING,
    startedAt: new Date(),
    completedAt: null,
    institutionsInserted: 0,
    institutionsUpdated: 0,
    coursesInserted: 0,
    coursesUpdated: 0,
    errorMessage: null,
    errorDetails: null,
    sourceUrl: null,
    sourceFileSize: null,
    totalRowsProcessed: null,
    triggeredBy: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export class InMemoryMecSyncLogRepository extends MecSyncLogRepositoryPort {
  readonly rows: SyncLogRow[] = [];
  readonly successes: Array<{ id: string; params: CompleteSyncLogParams }> = [];
  readonly failures: Array<{ id: string; params: FailSyncLogParams }> = [];
  private nextId = 1;

  async create(params: CreateSyncLogParams): Promise<SyncLogRow> {
    const row = buildRow({
      id: `log-${this.nextId++}`,
      status: MecSyncStatus.RUNNING,
      triggeredBy: params.triggeredBy,
    });
    this.rows.push(row);
    return row;
  }

  async markSuccess(id: string, params: CompleteSyncLogParams): Promise<SyncLogRow> {
    this.successes.push({ id, params });
    const row = this.rows.find((r) => r.id === id);
    if (row) {
      row.status = MecSyncStatus.SUCCESS;
      row.completedAt = new Date();
    }
    return row ?? buildRow({ id });
  }

  async markFailed(id: string, params: FailSyncLogParams): Promise<SyncLogRow> {
    this.failures.push({ id, params });
    const row = this.rows.find((r) => r.id === id);
    if (row) {
      row.status = MecSyncStatus.FAILED;
      row.completedAt = new Date();
      row.errorMessage = params.errorMessage;
    }
    return row ?? buildRow({ id });
  }

  async findLast(): Promise<SyncLogRow | null> {
    return this.rows.at(-1) ?? null;
  }

  async findHistory(limit: number): Promise<SyncLogRow[]> {
    return [...this.rows].reverse().slice(0, limit);
  }
}
