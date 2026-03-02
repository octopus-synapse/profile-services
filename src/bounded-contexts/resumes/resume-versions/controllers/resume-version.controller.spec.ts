import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { ResumeVersionController } from './resume-version.controller';
import { ResumeVersionService } from '../services/resume-version.service';

const createVersionService = () => ({
  getVersions: mock(() =>
    Promise.resolve([
      {
        id: 'version-1',
        versionNumber: 1,
        label: 'Initial',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]),
  ),
  restoreVersion: mock(() =>
    Promise.resolve({
      success: true,
      restoredFrom: new Date('2026-01-02T00:00:00.000Z'),
    }),
  ),
});

describe('ResumeVersionController - Contract', () => {
  let controller: ResumeVersionController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ResumeVersionController],
      providers: [{ provide: ResumeVersionService, useValue: createVersionService() }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<ResumeVersionController>(ResumeVersionController);
  });

  it('getVersionsNested returns data with versions', async () => {
    const result = await controller.getVersionsNested('resume-1', {
      user: { userId: 'user-1', email: 'john@example.com' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('versions');
  });

  it('restoreVersionNested returns data with success and restoredFrom', async () => {
    const result = await controller.restoreVersionNested('resume-1', 'version-1', {
      user: { userId: 'user-1', email: 'john@example.com' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('success');
    expect(result.data).toHaveProperty('restoredFrom');
  });

  it('getVersions returns data with versions', async () => {
    const result = await controller.getVersions('resume-1', {
      user: { userId: 'user-1', email: 'john@example.com' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('versions');
  });

  it('getVersion returns data with version', async () => {
    const result = await controller.getVersion('resume-1', 'version-1', {
      user: { userId: 'user-1', email: 'john@example.com' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('version');
  });

  it('restoreVersion returns data with success and restoredFrom', async () => {
    const result = await controller.restoreVersion('resume-1', 'version-1', {
      user: { userId: 'user-1', email: 'john@example.com' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('success');
    expect(result.data).toHaveProperty('restoredFrom');
  });
});