import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class OrderingPolicy {
  constructor(private readonly repository: GenericResumeSectionsRepositoryPort) {}

  async nextSectionOrder(resumeId: string): Promise<number> {
    const currentMax = await this.repository.findMaxResumeSectionOrder(resumeId);
    return (currentMax._max.order ?? -1) + 1;
  }

  async nextItemOrder(resumeSectionId: string): Promise<number> {
    const currentMax = await this.repository.findMaxSectionItemOrder(resumeSectionId);
    return (currentMax._max.order ?? -1) + 1;
  }
}
