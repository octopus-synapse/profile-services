import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import { PermissionGuard } from '@/bounded-contexts/identity/authorization';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { SkillManagementService } from '../services/skill-management.service';
import { SkillManagementController } from './skill-management.controller';

const createSkillManagementService = () => ({
  addSkillToResume: mock(() =>
    Promise.resolve({
      id: 'skill-1',
      resumeId: 'resume-123',
      name: 'TypeScript',
      category: 'Programming',
      level: 1,
      order: 0,
    }),
  ),
  updateSkill: mock(() =>
    Promise.resolve({
      id: 'skill-123',
      resumeId: 'resume-123',
      name: 'TypeScript Updated',
      category: 'Programming',
      level: 1,
      order: 0,
    }),
  ),
  deleteSkill: mock(() => Promise.resolve(undefined)),
  listSkillsForResume: mock(() =>
    Promise.resolve([
      { id: 'skill-1', name: 'TypeScript', category: 'Programming' },
      { id: 'skill-2', name: 'React', category: 'Framework' },
    ]),
  ),
});

describe('SkillManagementController', () => {
  let controller: SkillManagementController;
  let mockService: ReturnType<typeof createSkillManagementService>;

  beforeEach(async () => {
    mockService = createSkillManagementService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkillManagementController],
      providers: [
        {
          provide: SkillManagementService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SkillManagementController>(SkillManagementController);
  });

  it('addSkillToResume delegates to service and wraps the response', async () => {
    const input = { name: 'TypeScript', category: 'Programming' };

    const result = await controller.addSkillToResume('resume-123', input);

    expect(mockService.addSkillToResume).toHaveBeenCalledWith('resume-123', input);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('skill');
  });

  it('listSkillsForResume delegates to service and wraps the response', async () => {
    const result = await controller.listSkillsForResume('resume-123');

    expect(mockService.listSkillsForResume).toHaveBeenCalledWith('resume-123');
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('skills');
  });

  it('updateSkill delegates to service and wraps the response', async () => {
    const input = { name: 'TypeScript Updated' };

    const result = await controller.updateSkill('resume-123', 'skill-123', input);

    expect(mockService.updateSkill).toHaveBeenCalledWith('skill-123', input);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('skill');
  });

  it('deleteSkill delegates to service and returns deleted flag', async () => {
    const result = await controller.deleteSkill('resume-123', 'skill-123');

    expect(mockService.deleteSkill).toHaveBeenCalledWith('skill-123');
    expect(result).toEqual({
      success: true,
      data: { result: { deleted: true } },
    });
  });
});
