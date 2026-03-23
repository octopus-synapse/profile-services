import { Injectable } from '@nestjs/common';
import type { CreateSkillData, Skill, UpdateSkillData } from './ports/skill-management.port';
import type { SkillManagementRepositoryPort } from './ports/skill-management-repository.port';
import { AddSkillUseCase } from './use-cases/add-skill.use-case';
import { DeleteSkillUseCase } from './use-cases/delete-skill.use-case';
import { ListSkillsUseCase } from './use-cases/list-skills.use-case';
import { ListSkillsForResumeUseCase } from './use-cases/list-skills-for-resume.use-case';
import { UpdateSkillUseCase } from './use-cases/update-skill.use-case';

@Injectable()
export class SkillManagementService {
  private readonly addSkillUseCase: AddSkillUseCase;
  private readonly updateSkillUseCase: UpdateSkillUseCase;
  private readonly deleteSkillUseCase: DeleteSkillUseCase;
  private readonly listSkillsForResumeUseCase: ListSkillsForResumeUseCase;

  constructor(
    private readonly listSkillsUseCase: ListSkillsUseCase,
    private readonly repository: SkillManagementRepositoryPort,
  ) {
    this.addSkillUseCase = new AddSkillUseCase(repository);
    this.updateSkillUseCase = new UpdateSkillUseCase(repository);
    this.deleteSkillUseCase = new DeleteSkillUseCase(repository);
    this.listSkillsForResumeUseCase = new ListSkillsForResumeUseCase(repository);
  }

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
