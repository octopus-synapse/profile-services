import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminTechSkillsRepositoryPort } from '../../../domain/ports/admin-tech-skills.repository.port';

export class GetAdminTechSkillUseCase {
  constructor(private readonly repository: AdminTechSkillsRepositoryPort) {}

  async execute(id: string) {
    const item = await this.repository.findOne(id);
    if (!item) throw new EntityNotFoundException('TechSkill', id);
    return item;
  }
}
