import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { TechNicheInUseException } from '../../../../domain/exceptions/skills-catalog.exceptions';
import { AdminTechNichesRepositoryPort } from '../../../domain/ports/admin-tech-niches.repository.port';

export class DeleteAdminTechNicheUseCase {
  constructor(private readonly repository: AdminTechNichesRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findOne(id);
    if (!existing) throw new EntityNotFoundException('TechNiche', id);
    const skills = await this.repository.countSkills(id);
    if (skills > 0) throw new TechNicheInUseException(skills);
    await this.repository.delete(id);
  }
}
