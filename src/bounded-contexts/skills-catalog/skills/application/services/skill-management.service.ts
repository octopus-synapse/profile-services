/**
 * Application service that fronts the five skill-management use
 * cases for any caller that wants one import surface (controllers
 * still wire the use cases directly, but the wider codebase keeps
 * the historical `SkillManagementService` shape).
 */

import { Injectable } from '@nestjs/common';
import type {
  CreateSkillData,
  Skill,
  UpdateSkillData,
} from '../../domain/ports/skill-management.port';
import { AddSkillUseCase } from '../use-cases/add-skill/add-skill.use-case';
import { DeleteSkillUseCase } from '../use-cases/delete-skill/delete-skill.use-case';
import { ListSkillsUseCase } from '../use-cases/list-skills/list-skills.use-case';
import { ListSkillsForResumeUseCase } from '../use-cases/list-skills-for-resume/list-skills-for-resume.use-case';
import { UpdateSkillUseCase } from '../use-cases/update-skill/update-skill.use-case';

@Injectable()
export class SkillManagementService {
  constructor(
    private readonly listSkillsUseCase: ListSkillsUseCase,
    private readonly listSkillsForResumeUseCase: ListSkillsForResumeUseCase,
    private readonly addSkillUseCase: AddSkillUseCase,
    private readonly updateSkillUseCase: UpdateSkillUseCase,
    private readonly deleteSkillUseCase: DeleteSkillUseCase,
  ) {}

  listSkills(): string[] {
    return this.listSkillsUseCase.execute();
  }

  async listSkillsForResume(resumeId: string): Promise<Skill[]> {
    return this.listSkillsForResumeUseCase.execute(resumeId);
  }

  async addSkillToResume(resumeId: string, input: CreateSkillData): Promise<Skill> {
    return this.addSkillUseCase.execute(resumeId, input);
  }

  async updateSkill(skillId: string, input: UpdateSkillData): Promise<Skill> {
    return this.updateSkillUseCase.execute(skillId, input);
  }

  async deleteSkill(skillId: string): Promise<void> {
    return this.deleteSkillUseCase.execute(skillId);
  }
}
