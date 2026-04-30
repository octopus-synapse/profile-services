/**
 * In-memory `RageApplyRepositoryPort` for use case specs.
 *
 * Mirrors the production adapter's invariants: `(jobId, userId)` is
 * unique, and `findExistingApplication` is the cheap pre-check the
 * use case relies on for skip-existing semantics.
 */

import type { RageApplyUserSnapshot } from '../domain/entities/rage-apply';
import {
  type CreateApplicationInput,
  RageApplyRepositoryPort,
} from '../domain/ports/rage-apply.repository.port';

export class InMemoryRageApplyRepository extends RageApplyRepositoryPort {
  readonly users = new Map<string, RageApplyUserSnapshot>();
  readonly applications: CreateApplicationInput[] = [];

  seedUser(userId: string, snapshot: RageApplyUserSnapshot): void {
    this.users.set(userId, snapshot);
  }

  seedExistingApplication(jobId: string, userId: string): void {
    this.applications.push({
      jobId,
      userId,
      resumeId: 'seeded',
      tailoredVersionId: 'seeded',
      coverLetter: null,
    });
  }

  async findUserSnapshot(userId: string): Promise<RageApplyUserSnapshot | null> {
    return this.users.get(userId) ?? null;
  }

  async findExistingApplication(jobId: string, userId: string): Promise<boolean> {
    return this.applications.some((a) => a.jobId === jobId && a.userId === userId);
  }

  async createApplication(input: CreateApplicationInput): Promise<void> {
    if (await this.findExistingApplication(input.jobId, input.userId)) {
      throw new Error(`Duplicate application for ${input.userId}/${input.jobId}`);
    }
    this.applications.push(input);
  }
}
