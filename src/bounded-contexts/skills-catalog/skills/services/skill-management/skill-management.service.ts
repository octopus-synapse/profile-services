import { Injectable } from '@nestjs/common';
import type { CreateSkillData, Skill, UpdateSkillData } from './ports/skill-management.port';
import { ListSkillsUseCase } from './use-cases/list-skills.use-case';

@Injectable()
export class SkillManagementService {
  constructor(private readonly listSkillsUseCase: ListSkillsUseCase) {}

  listSkills(): string[] {
    return this.listSkillsUseCase.execute();
  }

  async listSkillsForResume(_resumeId: string): Promise<Skill[]> {
    return [];
  }

  async addSkillToResume(_resumeId: string, _input: CreateSkillData): Promise<Skill> {
    throw new Error('SkillManagementService.addSkillToResume is not wired yet.');
  }

  async updateSkill(_skillId: string, _input: UpdateSkillData): Promise<Skill> {
    throw new Error('SkillManagementService.updateSkill is not wired yet.');
  }

  async deleteSkill(_skillId: string): Promise<void> {}
}
