import { ResumeOwnershipPolicy } from '../policies/resume-ownership.policy';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

export class ListResumeSectionsUseCase {
  constructor(
    private readonly repository: GenericResumeSectionsRepositoryPort,
    private readonly ownershipPolicy: ResumeOwnershipPolicy,
  ) {}

  async execute(resumeId: string, userId: string) {
    await this.ownershipPolicy.ensureOwned(resumeId, userId);
    return this.repository.findResumeSections(resumeId);
  }
}
