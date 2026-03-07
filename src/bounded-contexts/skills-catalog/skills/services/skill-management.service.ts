import { Injectable } from '@nestjs/common';
import { SkillManagementService } from './skill-management/skill-management.service';

@Injectable()
export class SkillManagementFacadeService {
  constructor(private readonly skillManagementService: SkillManagementService) {}

  listSkills(): string[] {
    return this.skillManagementService.listSkills();
  }
}

export { SkillManagementService } from './skill-management/skill-management.service';
