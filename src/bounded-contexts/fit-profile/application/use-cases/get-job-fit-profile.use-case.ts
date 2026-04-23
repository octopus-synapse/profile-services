import { Injectable } from '@nestjs/common';
import {
  JobFitProfileRepositoryPort,
  type SavedJobFitProfile,
} from '../../domain/ports/job-fit-profile.repository.port';

/** Simple read — returned 1:1 from the repository. Wrapped in a
 * use-case so controllers never import repositories directly (arch
 * rule `dependency-rules.architecture.spec.ts`). */
@Injectable()
export class GetJobFitProfileUseCase {
  constructor(private readonly repo: JobFitProfileRepositoryPort) {}

  async execute(jobId: string): Promise<SavedJobFitProfile | null> {
    return this.repo.findByJobId(jobId);
  }
}
