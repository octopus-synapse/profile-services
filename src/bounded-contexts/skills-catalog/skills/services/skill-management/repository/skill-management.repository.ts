import { Injectable } from '@nestjs/common';
import { SkillManagementPort } from '../ports/skill-management.port';

@Injectable()
export class SkillManagementRepository extends SkillManagementPort {
  listSkills(): string[] {
    return [];
  }
}
