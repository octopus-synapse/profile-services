import { Inject, Injectable } from '@nestjs/common';
import {
  GENERIC_RESUME_SECTIONS_USE_CASES,
  type GenericResumeSectionsUseCases,
} from './generic-resume-sections/ports/generic-resume-sections-repository.port';

@Injectable()
export class GenericResumeSectionsService {
  constructor(
    @Inject(GENERIC_RESUME_SECTIONS_USE_CASES)
    private readonly useCases: GenericResumeSectionsUseCases,
  ) {}

  async listSectionTypes() {
    return this.useCases.listSectionTypesUseCase.execute();
  }

  async listResumeSections(resumeId: string, userId: string) {
    return this.useCases.listResumeSectionsUseCase.execute(resumeId, userId);
  }

  async createItem(
    resumeId: string,
    sectionTypeKey: string,
    userId: string,
    content: Record<string, unknown>,
  ) {
    return this.useCases.createSectionItemUseCase.execute(
      resumeId,
      sectionTypeKey,
      userId,
      content,
    );
  }

  async updateItem(
    resumeId: string,
    sectionTypeKey: string,
    itemId: string,
    userId: string,
    content: Record<string, unknown>,
  ) {
    return this.useCases.updateSectionItemUseCase.execute(
      resumeId,
      sectionTypeKey,
      itemId,
      userId,
      content,
    );
  }

  async deleteItem(
    resumeId: string,
    sectionTypeKey: string,
    itemId: string,
    userId: string,
  ): Promise<void> {
    await this.useCases.deleteSectionItemUseCase.execute(resumeId, sectionTypeKey, itemId, userId);
  }
}
