import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/bounded-contexts/identity/authorization';
import { ThemeApprovalController } from './theme-approval.controller';
import { ThemeApprovalService } from '../services/theme-approval.service';
import { ThemeCrudService } from '../services/theme-crud.service';

const createApprovalService = () => ({
  getPendingApprovals: mock(() => Promise.resolve([{ id: 'theme-1' }])),
  review: mock(() => Promise.resolve({ id: 'theme-2', status: 'PUBLISHED' })),
  submitForApproval: mock(() => Promise.resolve({ id: 'theme-3', status: 'PENDING_APPROVAL' })),
});

const createCrudService = () => ({
  findThemeByIdOrThrow: mock(() => Promise.resolve({ id: 'theme-1' })),
});

describe('ThemeApprovalController - Contract', () => {
  let controller: ThemeApprovalController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ThemeApprovalController],
      providers: [
        { provide: ThemeApprovalService, useValue: createApprovalService() },
        { provide: ThemeCrudService, useValue: createCrudService() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<ThemeApprovalController>(ThemeApprovalController);
  });

  it('getPending returns data with themes', async () => {
    const result = await controller.getPending('user-1');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('themes');
  });

  it('review returns data with theme', async () => {
    const result = await controller.review('user-1', { themeId: 'theme-1', approved: true } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('theme');
  });

  it('submit returns data with theme', async () => {
    const result = await controller.submit('user-1', 'theme-1');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('theme');
  });
});
