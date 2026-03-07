import { beforeEach, describe, expect, it } from 'bun:test';
import type { Request } from 'express';
import { ResumeVersionServicePort } from '@/bounded-contexts/resumes/resumes/ports/resume-version-service.port';
import { ResumeVersionController } from './resume-version.controller';

/**
 * Request type that matches what the controller expects.
 */
interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

/**
 * Simple stub service for testing controller response shapes.
 * No mocks - just returns expected data structures.
 */
class StubResumeVersionService extends ResumeVersionServicePort {
  async createSnapshot(_resumeId: string, _label?: string): Promise<void> {}

  async getVersions(_resumeId: string, _userId: string) {
    return [
      {
        id: 'version-1',
        versionNumber: 1,
        label: 'Initial',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];
  }

  async restoreVersion(_resumeId: string, _versionId: string, _userId: string) {
    return {
      success: true,
      restoredFrom: new Date('2026-01-02T00:00:00.000Z'),
    };
  }
}

/**
 * Factory to create controller with typed stub service.
 */
function createTestController(service: StubResumeVersionService): ResumeVersionController {
  return new ResumeVersionController(service);
}

/**
 * Creates a mock request with user data.
 */
function createRequestWithUser(): RequestWithUser {
  return {
    user: { userId: 'user-1', email: 'john@example.com' },
  } as RequestWithUser;
}

describe('ResumeVersionController - Contract', () => {
  let controller: ResumeVersionController;

  beforeEach(() => {
    const service = new StubResumeVersionService();
    controller = createTestController(service);
  });

  it('getVersionsNested returns data with versions', async () => {
    const result = await controller.getVersionsNested('resume-1', createRequestWithUser());

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('versions');
  });

  it('restoreVersionNested returns data with success and restoredFrom', async () => {
    const result = await controller.restoreVersionNested(
      'resume-1',
      'version-1',
      createRequestWithUser(),
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('success');
    expect(result.data).toHaveProperty('restoredFrom');
  });

  it('getVersions returns data with versions', async () => {
    const result = await controller.getVersions('resume-1', createRequestWithUser());

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('versions');
  });

  it('getVersion returns data with version', async () => {
    const result = await controller.getVersion('resume-1', 'version-1', createRequestWithUser());

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('version');
  });

  it('restoreVersion returns data with success and restoredFrom', async () => {
    const result = await controller.restoreVersion(
      'resume-1',
      'version-1',
      createRequestWithUser(),
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('success');
    expect(result.data).toHaveProperty('restoredFrom');
  });
});
