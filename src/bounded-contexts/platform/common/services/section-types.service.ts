import { Injectable } from '@nestjs/common';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';

@Injectable()
export class SectionTypesService {
  constructor(private readonly sectionTypeRepository: SectionTypeRepository) {}

  getAll() {
    return this.sectionTypeRepository.getAll();
  }
}
