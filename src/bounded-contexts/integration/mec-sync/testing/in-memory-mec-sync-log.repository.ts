/**
 * In-memory `MecSyncLogRepositoryPort`. Captures every state transition
 * (RUNNING → SUCCESS/FAILED) so specs can assert on the audit trail.
 */

import {
  type CompleteSyncLogParams,
  type CreateSyncLogParams,
  type FailSyncLogParams,
  MecSyncLogRepositoryPort,
  type SyncLogRow,
} from '../domain/ports/mec-sync-log.repository.port';

export class InMemoryMecSyncLogRepository extends MecSyncLogRepositoryPort {
  readonly rows: SyncLogRow[] = [];
  readonly successes: Array<{ id: string; params: CompleteSyncLogParams }> = [];
  readonly failures: Array<{ id: string; params: FailSyncLogParams }> = [];
  private nextId = 1;

  async create(params: CreateSyncLogParams): Promise<SyncLogRow> {
    const row: SyncLogRow = {
      id: `log-${this.nextId++}`,
      status: 'RUNNING',
      triggeredBy: params.triggeredBy,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return row;
  }

  async markSuccess(id: string, params: CompleteSyncLogParams): Promise<SyncLogRow> {
    this.successes.push({ id, params });
    const row = this.rows.find((r) => r.id === id);
    if (row) {
      row.status = 'SUCCESS';
      row.completedAt = new Date();
    }
    return row ?? { id };
  }

  async markFailed(id: string, params: FailSyncLogParams): Promise<SyncLogRow> {
    this.failures.push({ id, params });
    const row = this.rows.find((r) => r.id === id);
    if (row) {
      row.status = 'FAILED';
      row.completedAt = new Date();
      row.errorMessage = params.errorMessage;
    }
    return row ?? { id };
  }

  async findLast(): Promise<SyncLogRow | null> {
    return this.rows.at(-1) ?? null;
  }

  async findHistory(limit: number): Promise<SyncLogRow[]> {
    return [...this.rows].reverse().slice(0, limit);
  }
}
