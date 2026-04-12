import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';

export class DeleteSectionTypeUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(key: string): Promise<void> {
    const existing = await this.repository.findByKey(key);

    if (!existing) {
      throw new NotFoundException(`Section type '${key}' not found`);
    }

    if (existing.isSystem) {
      throw new BadRequestException('Cannot delete system section types');
    }

    const usageCount = await this.repository.countResumeSectionsForType(existing.id);

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete section type '${key}' - it is used by ${usageCount} resume(s). ` +
          'Deactivate it instead.',
      );
    }

    await this.repository.delete(key);
  }
}
