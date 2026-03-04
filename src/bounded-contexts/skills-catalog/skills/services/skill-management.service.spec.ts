import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { SkillManagementService } from './skill-management.service';
import type {
  Skill,
  SkillManagementUseCases,
} from './skill-management/ports/skill-management.port';

describe('SkillManagementService (Facade)', () => {
  let service: SkillManagementService;
  let useCases: SkillManagementUseCases;

  const mockSkill: Skill = {
    id: 'skill-1',
    resumeId: 'resume-1',
    name: 'TypeScript',
    category: 'Language',
    level: 5,
    order: 0,
  };

  beforeEach(() => {
    useCases = {
      listSkillsUseCase: {
        execute: mock(async () => [mockSkill]),
      },
      addSkillUseCase: {
        execute: mock(async () => mockSkill),
      },
      updateSkillUseCase: {
        execute: mock(async () => mockSkill),
      },
      deleteSkillUseCase: {
        execute: mock(async () => undefined),
      },
    };

    service = new SkillManagementService(useCases);
  });

  describe('listSkillsForResume', () => {
    it('delegates to listSkillsUseCase and returns skills array', async () => {
      const result = await service.listSkillsForResume('resume-1');

      expect(useCases.listSkillsUseCase.execute).toHaveBeenCalledWith(
        'resume-1',
      );
      expect(result).toEqual([mockSkill]);
    });
  });

  describe('addSkillToResume', () => {
    it('delegates to addSkillUseCase and returns skill (not envelope)', async () => {
      const input = { name: 'TypeScript', category: 'Language', level: 5 };

      const result = await service.addSkillToResume('resume-1', input);

      expect(useCases.addSkillUseCase.execute).toHaveBeenCalledWith(
        'resume-1',
        input,
      );
      expect(result).toEqual(mockSkill);
      // CRITICAL: Não deve retornar envelope { success, skill, message }
      expect(result).not.toHaveProperty('success');
      expect(result).not.toHaveProperty('message');
    });
  });

  describe('updateSkill', () => {
    it('delegates to updateSkillUseCase and returns skill (not envelope)', async () => {
      const input = { level: 5 };

      const result = await service.updateSkill('skill-1', input);

      expect(useCases.updateSkillUseCase.execute).toHaveBeenCalledWith(
        'skill-1',
        input,
      );
      expect(result).toEqual(mockSkill);
      // CRITICAL: Não deve retornar envelope { success, skill, message }
      expect(result).not.toHaveProperty('success');
      expect(result).not.toHaveProperty('message');
    });
  });

  describe('deleteSkill', () => {
    it('delegates to deleteSkillUseCase and returns void (not envelope)', async () => {
      const result = await service.deleteSkill('skill-1');

      expect(useCases.deleteSkillUseCase.execute).toHaveBeenCalledWith(
        'skill-1',
      );
      expect(result).toBeUndefined();
    });
  });
});
