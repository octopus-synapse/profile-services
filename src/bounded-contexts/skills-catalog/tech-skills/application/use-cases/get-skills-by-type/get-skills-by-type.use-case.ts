import type { TechSkill } from '../../../dto/tech-skill.schema';
import type { SkillType } from '../../../interfaces';
import { TechSkillRepositoryPort } from '../../ports/tech-skills.port';

export class GetSkillsByTypeUseCase {
  constructor(private readonly repository: TechSkillRepositoryPort) {}

  async execute(type: SkillType, limit = 50): Promise<TechSkill[]> {
    return this.repository.findByType(type, limit);
  }
}
