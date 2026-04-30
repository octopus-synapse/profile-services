import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminTechSkillsRepositoryPort } from '../../../domain/ports/admin-tech-skills.repository.port';

export class DeleteAdminTechSkillUseCase {
  constructor(private readonly repository: AdminTechSkillsRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findOne(id);
    if (!existing) throw new EntityNotFoundException('TechSkill', id);
    await this.repository.delete(id);
  }
}
