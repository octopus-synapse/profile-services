import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import { PermissionGuard } from '@/bounded-contexts/identity/authorization';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { SkillsUseCases } from '../../application/ports/skills.port';
import { SkillManagementController } from './skill-management.controller';

const createSkillsUseCases = () => ({
  listSkills: { execute: mock(() => []) },
  listSkillsForResume: {
    execute: mock(() =>
      Promise.resolve([
        { id: 'skill-1', name: 'TypeScript', category: 'Programming' },
        { id: 'skill-2', name: 'React', category: 'Framework' },
      ]),
    ),
  },
  addSkill: {
    execute: mock(() =>
      Promise.resolve({
        id: 'skill-1',
        resumeId: 'resume-123',
        name: 'TypeScript',
        category: 'Programming',
        level: 1,
        order: 0,
      }),
    ),
  },
  updateSkill: {
    execute: mock(() =>
      Promise.resolve({
        id: 'skill-123',
        resumeId: 'resume-123',
        name: 'TypeScript Updated',
        category: 'Programming',
        level: 1,
        order: 0,
      }),
    ),
  },
  deleteSkill: { execute: mock(() => Promise.resolve(undefined)) },
});

describe('SkillManagementController', () => {
  let controller: SkillManagementController;
  let mockBundle: ReturnType<typeof createSkillsUseCases>;

  beforeEach(async () => {
    mockBundle = createSkillsUseCases();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkillManagementController],
      providers: [{ provide: SkillsUseCases, useValue: mockBundle }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SkillManagementController>(SkillManagementController);
  });

  it('addSkillToResume delegates to bundle and wraps the response', async () => {
    const input = { name: 'TypeScript', category: 'Programming' };

    const result = await controller.addSkillToResume('resume-123', input);

    expect(mockBundle.addSkill.execute).toHaveBeenCalledWith('resume-123', input);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('skill');
  });

  it('listSkillsForResume delegates to bundle and wraps the response', async () => {
    const result = await controller.listSkillsForResume('resume-123');

    expect(mockBundle.listSkillsForResume.execute).toHaveBeenCalledWith('resume-123');
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('skills');
  });

  it('updateSkill delegates to bundle and wraps the response', async () => {
    const input = { name: 'TypeScript Updated' };

    const result = await controller.updateSkill('resume-123', 'skill-123', input);

    expect(mockBundle.updateSkill.execute).toHaveBeenCalledWith('skill-123', input);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('skill');
  });

  it('deleteSkill delegates to bundle and returns deleted flag', async () => {
    const result = await controller.deleteSkill('resume-123', 'skill-123');

    expect(mockBundle.deleteSkill.execute).toHaveBeenCalledWith('skill-123');
    expect(result).toEqual({
      success: true,
      data: { result: { deleted: true } },
    });
  });
});
