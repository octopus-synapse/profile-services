import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminTechNichesRepositoryPort } from '../../../domain/ports/admin-tech-niches.repository.port';

export class UpdateAdminTechNicheUseCase {
  constructor(private readonly repository: AdminTechNichesRepositoryPort) {}

  async execute(id: string, input: Record<string, unknown>) {
    const existing = await this.repository.findOne(id);
    if (!existing) throw new EntityNotFoundException('TechNiche', id);
    return this.repository.update(id, input);
  }
}
