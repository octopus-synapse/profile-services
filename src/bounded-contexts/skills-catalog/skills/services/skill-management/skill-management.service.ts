import { Injectable } from '@nestjs/common';
import { ListSkillsUseCase } from './use-cases/list-skills.use-case';

@Injectable()
export class SkillManagementService {
  constructor(private readonly listSkillsUseCase: ListSkillsUseCase) {}

  listSkills(): string[] {
    return this.listSkillsUseCase.execute();
  }
}
