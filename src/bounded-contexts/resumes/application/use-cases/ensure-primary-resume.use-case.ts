/**
 * Ensure Primary Resume Use Case
 *
 * Cross-cutting guard for actions that require a user to own at least
 * one resume — typically used by upstream BCs (job-match, public-resumes
 * publishing) that want to fail-closed before touching their own state.
 *
 * The check is intentionally minimal: it asks the resumes repository for
 * the user's resumes and throws `PrimaryResumeRequiredException` when the
 * list is empty. We do not look at the `User.primaryResumeId` column
 * directly so we stay decoupled from the identity BC's user table.
 */

import { ResumesRepositoryPort } from '../../core/ports/resumes-repository.port';
import { PrimaryResumeRequiredException } from '../../domain/exceptions';

export class EnsurePrimaryResumeUseCase {
  constructor(private readonly repository: ResumesRepositoryPort) {}

  async execute(userId: string): Promise<void> {
    const resumes = await this.repository.listUserResumes(userId);
    if (resumes.length === 0) {
      throw new PrimaryResumeRequiredException();
    }
  }
}
