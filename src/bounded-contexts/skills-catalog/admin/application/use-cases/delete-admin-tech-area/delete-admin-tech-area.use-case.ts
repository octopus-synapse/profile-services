import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminTechAreasRepositoryPort } from '../../../domain/ports/admin-tech-areas.repository.port';
import { TechAreaInUseException } from '../../../../domain/exceptions/skills-catalog.exceptions';

export class DeleteAdminTechAreaUseCase {
  constructor(private readonly repository: AdminTechAreasRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findOne(id);
    if (!existing) throw new EntityNotFoundException('TechArea', id);
    const niches = await this.repository.countNiches(id);
    if (niches > 0) throw new TechAreaInUseException(niches);
    await this.repository.delete(id);
  }
}
