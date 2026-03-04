import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ResumeVersionService } from './resume-version.service';
import type {
  ResumeVersionRecord,
  ResumeVersionListItem,
  VersionRestoreResult,
  ResumeVersionUseCases,
} from './resume-version/ports/resume-version.port';

describe('ResumeVersionService (Facade)', () => {
  let service: ResumeVersionService;
  let useCases: ResumeVersionUseCases;

  beforeEach(() => {
    // Mock completo para ResumeVersionRecord
    const mockVersionRecord: ResumeVersionRecord = {
      id: 'v-1',
      resumeId: 'resume-1',
      versionNumber: 1,
      snapshot: { experience: 'Software Engineer' }, // Deve ser um objeto válido
      label: 'label',
      createdAt: new Date('2026-01-01'),
    };

    // Mock completo para ResumeVersionListItem
    const mockVersionListItem: ResumeVersionListItem = {
      id: 'v-1',
      versionNumber: 1,
      label: 'label',
      createdAt: new Date('2026-01-01'),
    };

    // Mock completo para VersionRestoreResult
    const mockRestoreResult: VersionRestoreResult = {
      restoredFrom: new Date('2026-01-01'),
    };

    useCases = {
      createSnapshotUseCase: {
        execute: mock(async () => mockVersionRecord),
      },
      getVersionsUseCase: {
        execute: mock(async () => [mockVersionListItem]),
      },
      restoreVersionUseCase: {
        execute: mock(async () => mockRestoreResult),
      },
    };

    service = new ResumeVersionService(useCases);
  });

  it('delegates createSnapshot to use case', async () => {
    const result = await service.createSnapshot('resume-1', 'label');

    expect(useCases.createSnapshotUseCase.execute).toHaveBeenCalledWith(
      'resume-1',
      'label',
    );

    expect(result).toEqual({
      id: 'v-1',
      resumeId: 'resume-1',
      versionNumber: 1,
      snapshot: { experience: 'Software Engineer' },
      label: 'label',
      createdAt: expect.any(Date),
    });
  });

  it('delegates getVersions to use case', async () => {
    const result = await service.getVersions('resume-1', 'user-1');

    expect(useCases.getVersionsUseCase.execute).toHaveBeenCalledWith(
      'resume-1',
      'user-1',
    );

    expect(result).toEqual([
      {
        id: 'v-1',
        versionNumber: 1,
        label: 'label',
        createdAt: expect.any(Date),
      },
    ]);
  });

  it('delegates restoreVersion to use case', async () => {
    const result = await service.restoreVersion(
      'resume-1',
      'version-1',
      'user-1',
    );

    expect(useCases.restoreVersionUseCase.execute).toHaveBeenCalledWith(
      'resume-1',
      'version-1',
      'user-1',
    );

    expect(result).toEqual({
      restoredFrom: expect.any(Date),
    });
  });

  it('propagates errors from restoreVersion use case', async () => {
    // Mock de erro com tipo correto
    useCases.restoreVersionUseCase.execute = mock(async () => {
      throw new Error('cannot restore');
    });

    await expect(
      service.restoreVersion('resume-1', 'version-1', 'user-1'),
    ).rejects.toThrow('cannot restore');
  });

  // Teste adicional para verificar o comportamento com label opcional
  it('creates snapshot without label', async () => {
    const mockVersionRecordWithoutLabel: ResumeVersionRecord = {
      id: 'v-2',
      resumeId: 'resume-1',
      versionNumber: 2,
      snapshot: { experience: 'Senior Engineer' },
      label: null,
      createdAt: new Date('2026-01-02'),
    };

    useCases.createSnapshotUseCase.execute = mock(
      async () => mockVersionRecordWithoutLabel,
    );

    const result = await service.createSnapshot('resume-1');

    expect(useCases.createSnapshotUseCase.execute).toHaveBeenCalledWith(
      'resume-1',
      undefined,
    );

    expect(result.label).toBeNull();
  });
});
