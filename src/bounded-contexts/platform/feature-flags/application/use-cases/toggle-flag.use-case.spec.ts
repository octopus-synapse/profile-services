/**
 * ToggleFlagUseCase — input validation coverage.
 *
 * The route layer also runs zod validation, but this use case is
 * exposed outside HTTP (CLI bootstrap, integration tests) so the domain
 * guard surfaces `FeatureFlagInvalidInputException` for empty keys /
 * missing actors / no-op toggles.
 */

import { describe, expect, it, mock } from 'bun:test';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import {
  FeatureFlagInvalidInputException,
  FeatureFlagNotFoundException,
} from '../../domain/exceptions/feature-flag.exceptions';
import type { FeatureFlagRepositoryPort } from '../../domain/ports/feature-flag.repository.port';
import type { FlagAuditPort } from '../ports/flag-audit.port';
import type { FlagCachePort } from '../ports/flag-cache.port';
import type { FlagStateService } from '../services/flag-state.service';
import { ToggleFlagUseCase } from './toggle-flag.use-case';

const buildUseCase = () => {
  const repo = {
    findByKey: mock(() => Promise.resolve(null)),
    getByKey: mock(() =>
      Promise.reject(new FeatureFlagNotFoundException('test-key')),
    ),
    update: mock(),
  } as unknown as FeatureFlagRepositoryPort;
  const cache = { invalidateAll: mock() } as unknown as FlagCachePort;
  const state = { markStale: mock(), getAll: mock(() => []) } as unknown as FlagStateService;
  const audit = { logFlagToggle: mock() } as unknown as FlagAuditPort;
  const events = { publish: mock() } as unknown as EventBusPort;
  const logger = { log: mock(), warn: mock(), error: mock() } as unknown as LoggerPort;
  return new ToggleFlagUseCase(repo, cache, state, audit, events, logger);
};

describe('ToggleFlagUseCase — input validation', () => {
  it('throws FeatureFlagInvalidInputException when key is empty', async () => {
    const useCase = buildUseCase();
    await expect(useCase.execute({ key: '', enabled: true, actorId: 'admin-1' })).rejects.toThrow(
      FeatureFlagInvalidInputException,
    );
  });

  it('throws FeatureFlagInvalidInputException when actorId is empty', async () => {
    const useCase = buildUseCase();
    await expect(useCase.execute({ key: 'flag.x', enabled: true, actorId: '   ' })).rejects.toThrow(
      FeatureFlagInvalidInputException,
    );
  });

  it('throws FeatureFlagInvalidInputException when neither enabled nor enabledForRoles is set', async () => {
    const useCase = buildUseCase();
    await expect(useCase.execute({ key: 'flag.x', actorId: 'admin-1' })).rejects.toThrow(
      FeatureFlagInvalidInputException,
    );
  });
});
