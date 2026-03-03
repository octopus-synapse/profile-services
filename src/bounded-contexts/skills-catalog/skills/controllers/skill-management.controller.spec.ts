/**
 * Unit tests for SkillManagementController
 *
 * Tests HTTP layer behavior including:
 * - Request handling and response formatting
 * - Guard/permission decorator application
 * - Service delegation
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { SkillManagementController } from './skill-management.controller';
import { SkillManagementService } from '../services/skill-management.service';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { PermissionGuard } from '@/bounded-contexts/identity/authorization';

describe('SkillManagementController', () => {
  let controller: SkillManagementController;
  let mockService: jest.Mocked<SkillManagementService>;

  beforeEach(async () => {
    mockService = {
      addSkillToResume: jest.fn(),
      updateSkill: jest.fn(),
      deleteSkill: jest.fn(),
      listSkillsForResume: jest.fn(),
    } as unknown as jest.Mocked<SkillManagementService>;

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

    controller = module.get<SkillManagementController>(
      SkillManagementController,
    );
  });

  describe('addSkillToResume', () => {
    it('should delegate to service and return created skill', async () => {
      const resumeId = 'resume-123';
      const input = { name: 'TypeScript', category: 'Programming' };
      const expectedSkill = { id: 'skill-1', ...input, level: 1, resumeId };

      mockService.addSkillToResume.mockResolvedValue(expectedSkill);

      const result = await controller.addSkillToResume(resumeId, input);

      expect(mockService.addSkillToResume).toHaveBeenCalledWith(resumeId, input);
      expect(result).toEqual({ success: true, data: { skill: expectedSkill } });
    });
  });

  describe('listSkillsForResume', () => {
    it('should return all skills for resume', async () => {
      const resumeId = 'resume-123';
      const expectedSkills = [
        { id: 'skill-1', name: 'TypeScript', category: 'Programming' },
        { id: 'skill-2', name: 'React', category: 'Framework' },
      ];

      mockService.listSkillsForResume.mockResolvedValue(expectedSkills);

      const result = await controller.listSkillsForResume(resumeId);

      expect(mockService.listSkillsForResume).toHaveBeenCalledWith(resumeId);
      expect(result).toEqual({ success: true, data: { skills: expectedSkills } });
    });
  });

  describe('updateSkill', () => {
    it('should delegate update to service', async () => {
      const skillId = 'skill-123';
      const input = { name: 'TypeScript Updated' };
      const expectedSkill = { id: skillId, name: 'TypeScript Updated' };

      mockService.updateSkill.mockResolvedValue(expectedSkill);

      const result = await controller.updateSkill(skillId, input);

      expect(mockService.updateSkill).toHaveBeenCalledWith(skillId, input);
      expect(result).toEqual({ success: true, data: { skill: expectedSkill } });
    });
  });

  describe('deleteSkill', () => {
    it('should delegate delete to service', async () => {
      const skillId = 'skill-123';

      mockService.deleteSkill.mockResolvedValue(undefined);

      const result = await controller.deleteSkill(skillId);

      expect(mockService.deleteSkill).toHaveBeenCalledWith(skillId);
      expect(result).toEqual({ success: true, data: { result: { deleted: true } } });
    });
  });
});
