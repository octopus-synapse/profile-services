import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { CsvFileCacheService } from './csv-file-cache.service';

describe('CsvFileCacheService', () => {
  it('exposes filesystem helpers without throwing on missing files', () => {
    const service = new CsvFileCacheService(stubLogger);

    // The default LOCAL_CSV_PATH likely doesn't exist in CI; both flags
    // should resolve to false rather than throw.
    expect(typeof service.exists()).toBe('boolean');
    expect(typeof service.isValid()).toBe('boolean');
  });
});
