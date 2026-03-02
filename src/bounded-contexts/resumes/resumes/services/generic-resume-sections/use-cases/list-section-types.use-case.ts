import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class ListSectionTypesUseCase {
  constructor(private readonly repository: GenericResumeSectionsRepositoryPort) {}

  execute() {
    return this.repository.findActiveSectionTypes();
  }
}
