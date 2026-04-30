import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminTechAreasRepositoryPort } from '../../../domain/ports/admin-tech-areas.repository.port';

export class UpdateAdminTechAreaUseCase {
  constructor(private readonly repository: AdminTechAreasRepositoryPort) {}

  async execute(id: string, input: Record<string, unknown>) {
    const existing = await this.repository.findOne(id);
    if (!existing) throw new EntityNotFoundException('TechArea', id);
    return this.repository.update(id, input);
  }
}
