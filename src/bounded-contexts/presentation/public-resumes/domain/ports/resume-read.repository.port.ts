/**
 * Resume Read Repository Port (Public Resumes context)
 *
 * Read-only resume access for public resume operations. The share payload
 * itself is built by `ResumeShareService.getResumeWithCache`.
 */

export abstract class ResumeReadRepositoryPort {
  abstract findById(id: string): Promise<{ id: string; userId: string } | null>;
}
