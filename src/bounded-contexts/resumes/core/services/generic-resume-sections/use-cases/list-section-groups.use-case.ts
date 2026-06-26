import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class ListSectionGroupsUseCase {
  constructor(private readonly repository: GenericResumeSectionsRepositoryPort) {}

  execute() {
    return this.repository.findActiveSectionGroups();
  }
}
