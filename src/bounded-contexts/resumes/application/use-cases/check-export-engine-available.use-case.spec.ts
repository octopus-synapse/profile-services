import { describe, expect, it } from 'bun:test';
import { ExportEngineUnavailableException } from '../../domain/exceptions';
import { CheckExportEngineAvailableUseCase } from './check-export-engine-available.use-case';

describe('CheckExportEngineAvailableUseCase', () => {
  it('resolves silently when the probe reports healthy', async () => {
    const useCase = new CheckExportEngineAvailableUseCase({
      isAvailable: () => true,
    });
    await expect(useCase.execute('pdf')).resolves.toBeUndefined();
  });

  it('throws ExportEngineUnavailableException when the probe is unhealthy', async () => {
    const useCase = new CheckExportEngineAvailableUseCase({
      isAvailable: () => false,
    });
    await expect(useCase.execute('docx')).rejects.toBeInstanceOf(ExportEngineUnavailableException);
  });

  it('awaits async probes', async () => {
    const useCase = new CheckExportEngineAvailableUseCase({
      isAvailable: () => Promise.resolve(false),
    });
    await expect(useCase.execute('json')).rejects.toBeInstanceOf(ExportEngineUnavailableException);
  });
});
