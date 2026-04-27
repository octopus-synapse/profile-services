import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GetSyncHistoryUseCase } from '../../application/use-cases/get-sync-history/get-sync-history.use-case';
import { GetSyncStatusUseCase } from '../../application/use-cases/get-sync-status/get-sync-status.use-case';
import { TriggerMecSyncUseCase } from '../../application/use-cases/trigger-mec-sync/trigger-mec-sync.use-case';
import { InternalAuthGuard } from '../guards/internal-auth.guard';
import { MecSyncInternalController } from './mec-sync-internal.controller';

describe('MecSyncInternalController - Contract', () => {
  let controller: MecSyncInternalController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [MecSyncInternalController],
      providers: [
        {
          provide: TriggerMecSyncUseCase,
          useValue: {
            execute: mock(() =>
              Promise.resolve({
                institutionsInserted: 10,
                coursesInserted: 30,
                totalRowsProcessed: 40,
                errors: [],
              }),
            ),
          },
        },
        {
          provide: GetSyncStatusUseCase,
          useValue: {
            execute: mock(() =>
              Promise.resolve({ isRunning: false, metadata: null, lastSync: null }),
            ),
          },
        },
        {
          provide: GetSyncHistoryUseCase,
          useValue: { execute: mock(() => Promise.resolve([{ id: 'sync-1' }])) },
        },
      ],
    })
      .overrideGuard(InternalAuthGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<MecSyncInternalController>(MecSyncInternalController);
  });

  it('triggerSync returns data with execution summary keys', async () => {
    const result = await controller.triggerSync();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('institutionsInserted');
    expect(result.data).toHaveProperty('coursesInserted');
    expect(result.data).toHaveProperty('totalRowsProcessed');
    expect(result.data).toHaveProperty('errorsCount');
  });

  it('getSyncStatus returns data with isRunning, metadata and lastSync', async () => {
    const result = await controller.getSyncStatus();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('isRunning');
    expect(result.data).toHaveProperty('metadata');
    expect(result.data).toHaveProperty('lastSync');
  });

  it('getSyncHistory returns data with history', async () => {
    const result = await controller.getSyncHistory('10');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('history');
  });
});
