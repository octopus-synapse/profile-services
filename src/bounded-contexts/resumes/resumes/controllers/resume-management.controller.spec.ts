import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/bounded-contexts/identity/authorization';
import { ResumeManagementController } from './resume-management.controller';
import { ResumeManagementService } from '../services/resume-management.service';

const createMockService = () => ({
  listResumesForUser: mock(() =>
    Promise.resolve({ resumes: [{ id: 'resume-1' }] }),
  ),
  getResumeDetails: mock(() =>
    Promise.resolve({ id: 'resume-1', title: 'My Resume' }),
  ),
  deleteResume: mock(() => Promise.resolve(undefined)),
});

describe('ResumeManagementController - Contract', () => {
  let controller: ResumeManagementController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ResumeManagementController],
      providers: [
        { provide: ResumeManagementService, useValue: createMockService() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<ResumeManagementController>(
      ResumeManagementController,
    );
  });

  it('listResumesForUser returns data with resumes', async () => {
    const result = await controller.listResumesForUser('user-1');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('resumes');
  });

  it('getResumeDetails returns data with resume', async () => {
    const result = await controller.getResumeDetails('resume-1');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('resume');
  });

  it('deleteResume returns data with message', async () => {
    const result = await controller.deleteResume('resume-1');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('message');
  });
});
