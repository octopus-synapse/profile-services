import { NotFoundException } from '@nestjs/common';
import type { SectionTypeResponseDto } from '../../../dto';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';
import { toResponseDto } from '../../to-response-dto';

export class GetSectionTypeUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(key: string): Promise<SectionTypeResponseDto> {
    const sectionType = await this.repository.findByKey(key);

    if (!sectionType) {
      throw new NotFoundException(`Section type '${key}' not found`);
    }

    return toResponseDto(sectionType);
  }
}
