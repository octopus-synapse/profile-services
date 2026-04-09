import type { ResumeEventPublisher } from '../../shared-kernel/domain/ports';
import { ResumeVersionServicePort } from '../ports/resume-version-service.port';
import { ResumesRepositoryPort } from '../ports/resumes-repository.port';
import { RESUMES_USE_CASES, type ResumesUseCases } from './ports/resumes-use-cases.port';
import { CreateResumeForUserUseCase } from './use-cases/create-resume-for-user/create-resume-for-user.use-case';
import { DeleteResumeForUserUseCase } from './use-cases/delete-resume-for-user/delete-resume-for-user.use-case';
import { FindAllUserResumesUseCase } from './use-cases/find-all-user-resumes/find-all-user-resumes.use-case';
import { FindResumeByIdForUserUseCase } from './use-cases/find-resume-by-id-for-user/find-resume-by-id-for-user.use-case';
import { GetRemainingSlotsUseCase } from './use-cases/get-remaining-slots/get-remaining-slots.use-case';
import { UpdateResumeForUserUseCase } from './use-cases/update-resume-for-user/update-resume-for-user.use-case';

export { RESUMES_USE_CASES };

export function buildResumesUseCases(
  repository: ResumesRepositoryPort,
  versionService: ResumeVersionServicePort,
  eventPublisher: ResumeEventPublisher,
): ResumesUseCases {
  return {
    findAllUserResumesUseCase: new FindAllUserResumesUseCase(repository),
    findResumeByIdForUserUseCase: new FindResumeByIdForUserUseCase(repository),
    createResumeForUserUseCase: new CreateResumeForUserUseCase(repository, eventPublisher),
    updateResumeForUserUseCase: new UpdateResumeForUserUseCase(
      repository,
      versionService,
      eventPublisher,
    ),
    deleteResumeForUserUseCase: new DeleteResumeForUserUseCase(repository, eventPublisher),
    getRemainingSlotsUseCase: new GetRemainingSlotsUseCase(repository),
  };
}
