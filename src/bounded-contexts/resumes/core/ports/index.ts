/**
 * Resumes Ports
 *
 * Abstract ports for dependency inversion in the resumes bounded context.
 */

export { ResumeVersionServicePort } from './resume-version-service.port';
export type { ResumeEntity } from './resumes-repository.port';

export { ResumesRepositoryPort } from './resumes-repository.port';
export type {
  ResumeResult,
  ResumeSlots,
  UserResumesPaginatedResult,
  UserResumesPagination,
} from './resumes-service.port';
export { ResumesServicePort } from './resumes-service.port';
