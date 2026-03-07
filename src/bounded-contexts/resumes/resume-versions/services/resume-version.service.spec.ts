import { beforeEach, describe, expect, it } from 'bun:test';
import type {
  ResumeVersionListItem,
  ResumeVersionRecord,
  ResumeVersionUseCases,
  VersionRestoreResult,
} from './resume-version/ports/resume-version.port';
import { ResumeVersionService } from './resume-version.service';

/**
 * Stub use cases for testing the facade pattern.
 * Returns expected data structures without mocks.
 */
class StubUseCases implements ResumeVersionUseCases {
  lastCreateSnapshotCall: { resumeId: string; label?: string } | null = null;
  lastGetVersionsCall: { resumeId: string; userId: string } | null = null;
  lastRestoreVersionCall: {
    resumeId: string;
    versionId: string;
    userId: string;
  } | null = null;
  shouldThrowOnRestore = false;

  createSnapshotUseCase = {
    execute: async (resumeId: string, label?: string): Promise<ResumeVersionRecord> => {
      this.lastCreateSnapshotCall = { resumeId, label };
      return {
        id: 'v-1',
        resumeId,
        versionNumber: 1,
        snapshot: { experience: 'Software Engineer' },
        label: label ?? null,
        createdAt: new Date('2026-01-01'),
      };
    },
  };

  getVersionsUseCase = {
    execute: async (resumeId: string, userId: string): Promise<ResumeVersionListItem[]> => {
      this.lastGetVersionsCall = { resumeId, userId };
      return [
        {
          id: 'v-1',
          versionNumber: 1,
          label: 'label',
          createdAt: new Date('2026-01-01'),
        },
      ];
    },
  };

  restoreVersionUseCase = {
    execute: async (
      resumeId: string,
      versionId: string,
      userId: string,
    ): Promise<VersionRestoreResult> => {
      if (this.shouldThrowOnRestore) {
        throw new Error('cannot restore');
      }
      this.lastRestoreVersionCall = { resumeId, versionId, userId };
      return {
        restoredFrom: new Date('2026-01-01'),
      };
    },
  };
}

describe('ResumeVersionService (Facade)', () => {
  let service: ResumeVersionService;
  let useCases: StubUseCases;

  beforeEach(() => {
    useCases = new StubUseCases();
    service = new ResumeVersionService(useCases);
  });

  it('delegates createSnapshot to use case', async () => {
    const result = await service.createSnapshot('resume-1', 'label');

    expect(useCases.lastCreateSnapshotCall).toEqual({
      resumeId: 'resume-1',
      label: 'label',
    });

    expect(result).toBeUndefined();
  });

  it('delegates getVersions to use case', async () => {
    const result = await service.getVersions('resume-1', 'user-1');

    expect(useCases.lastGetVersionsCall).toEqual({
      resumeId: 'resume-1',
      userId: 'user-1',
    });

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
    const result = await service.restoreVersion('resume-1', 'version-1', 'user-1');

    expect(useCases.lastRestoreVersionCall).toEqual({
      resumeId: 'resume-1',
      versionId: 'version-1',
      userId: 'user-1',
    });

    expect(result).toEqual({
      restoredFrom: expect.any(Date),
    });
  });

  it('propagates errors from restoreVersion use case', async () => {
    useCases.shouldThrowOnRestore = true;

    await expect(service.restoreVersion('resume-1', 'version-1', 'user-1')).rejects.toThrow(
      'cannot restore',
    );
  });

  it('creates snapshot without label', async () => {
    await service.createSnapshot('resume-1');

    expect(useCases.lastCreateSnapshotCall).toEqual({
      resumeId: 'resume-1',
      label: undefined,
    });

    expect(useCases.lastCreateSnapshotCall?.label).toBeUndefined();
  });
});
