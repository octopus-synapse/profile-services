import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminTechSkillsRepositoryPort } from '../../../domain/ports/admin-tech-skills.repository.port';

export class UpdateAdminTechSkillUseCase {
  constructor(private readonly repository: AdminTechSkillsRepositoryPort) {}

  async execute(id: string, input: Record<string, unknown>) {
    const existing = await this.repository.findOne(id);
    if (!existing) throw new EntityNotFoundException('TechSkill', id);
    return this.repository.update(id, input);
  }
}
