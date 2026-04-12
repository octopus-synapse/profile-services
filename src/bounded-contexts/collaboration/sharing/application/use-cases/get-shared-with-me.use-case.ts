import type { CollaborationRepositoryPort } from '../../domain/ports/collaboration-repository.port';
import type { SharedResume } from '../../domain/types/collaboration.types';

export class GetSharedWithMeUseCase {
  constructor(private readonly repo: CollaborationRepositoryPort) {}

  async execute(userId: string): Promise<SharedResume[]> {
    return this.repo.getSharedResumes(userId);
  }
}
