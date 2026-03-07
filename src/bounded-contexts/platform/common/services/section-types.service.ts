import { Injectable } from '@nestjs/common';
import { SectionTypeRepository } from '@/shared-kernel/repositories/section-type.repository';

@Injectable()
export class SectionTypesService {
  constructor(private readonly sectionTypeRepository: SectionTypeRepository) {}

  getAll() {
    return this.sectionTypeRepository.getAll();
  }
}
