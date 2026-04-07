import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type {
  ResumeResult,
  UserResumesPaginatedResult,
} from '../../../ports/resumes-service.port';

export class FindAllUserResumesUseCase {
  constructor(private readonly repository: ResumesRepositoryPort) {}

  async execute(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<ResumeResult[] | UserResumesPaginatedResult> {
    if (page !== undefined && limit !== undefined) {
      if (page < 1) page = 1;
      if (limit < 1) limit = 1;
      if (limit > 100) limit = 100;

      return this.findPaginated(userId, page, limit);
    }

    return this.repository.findAllUserResumes(userId);
  }

  private async findPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<UserResumesPaginatedResult> {
    const skip = (page - 1) * limit;
    const [resumes, total] = await Promise.all([
      this.repository.findAllUserResumesPaginated(userId, skip, limit),
      this.repository.countUserResumes(userId),
    ]);
    const totalPages = Math.ceil(total / limit);

    return {
      resumes,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
