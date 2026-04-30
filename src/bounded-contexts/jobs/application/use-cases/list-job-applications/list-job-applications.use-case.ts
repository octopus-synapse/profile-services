/**
 * Employer-side: list applications received for a job the caller owns.
 * Guards against reading applications for jobs authored by other users
 * (`NotJobOwnerException`) and hydrates each application with a
 * candidate snapshot via a small second query — `JobApplication` has
 * no direct `user` relation in the schema.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { NotJobOwnerException } from '../../../domain/exceptions/jobs.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export interface ListJobApplicationsResult {
  readonly items: Array<Record<string, unknown>>;
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export class ListJobApplicationsUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async execute(
    jobId: string,
    ownerId: string,
    page = 1,
    limit = 20,
  ): Promise<ListJobApplicationsResult> {
    const job = await this.repository.findJobOwnerSummary(jobId);
    if (!job) throw new EntityNotFoundException('Job', jobId);
    if (job.authorId !== ownerId) throw new NotJobOwnerException();

    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);

    const { items, total } = await this.repository.listApplicationsByJob(
      jobId,
      safePage,
      safeLimit,
    );

    const userIds = items.map((a) => a.userId);
    const users = await this.repository.findUsersByIds(userIds);
    const userById = new Map(users.map((u) => [u.id, u]));

    const projected = items.map(({ userId, ...rest }) => ({
      ...rest,
      user: userById.get(userId) ?? null,
    }));

    return {
      items: projected,
      pagination: {
        page: safePage,
        pageSize: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}
