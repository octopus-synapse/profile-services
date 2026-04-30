import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMecCache } from '../../testing/in-memory-mec-cache';
import { InMemoryMecSyncLogRepository } from '../../testing/in-memory-mec-sync-log.repository';
import { SyncHelperService } from './sync-helper.service';

describe('SyncHelperService', () => {
  it('marks the log as success and persists metadata', async () => {
    const cache = new InMemoryMecCache();
    const repo = new InMemoryMecSyncLogRepository();
    const created = await repo.create({ triggeredBy: 'test' });
    const helper = new SyncHelperService(stubLogger, cache, repo);

    await helper.finalizeSyncSuccess(
      created.id,
      {
        institutionsInserted: 5,
        institutionsUpdated: 0,
        coursesInserted: 10,
        coursesUpdated: 0,
        totalRowsProcessed: 100,
        sourceFileSize: 1024,
        institutionCount: 5,
        courseCount: 10,
      },
      Date.now() - 100,
      'test',
    );

    expect(repo.successes).toHaveLength(1);
    expect(cache.snapshot('mec:sync:metadata')).toMatchObject({ lastSyncStatus: 'success' });
  });

  it('marks the log as failed on error', async () => {
    const cache = new InMemoryMecCache();
    const repo = new InMemoryMecSyncLogRepository();
    const created = await repo.create({ triggeredBy: 'test' });
    const helper = new SyncHelperService(stubLogger, cache, repo);

    await helper.handleSyncError(created.id, new Error('boom'), Date.now() - 50, 'test');

    expect(repo.failures).toHaveLength(1);
    expect(cache.snapshot('mec:sync:metadata')).toMatchObject({ lastSyncStatus: 'failed' });
  });
});
