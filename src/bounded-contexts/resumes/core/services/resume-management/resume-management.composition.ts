import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import {
  RESUME_MANAGEMENT_USE_CASES,
  type ResumeManagementUseCases,
} from './ports/resume-management.port';
import { ResumeManagementRepository } from './repository/resume-management.repository';
import { DeleteResumeUseCase } from './use-cases/delete-resume.use-case';
import { GetResumeDetailsUseCase } from './use-cases/get-resume-details.use-case';
import { ListResumesForUserUseCase } from './use-cases/list-resumes-for-user.use-case';

export { RESUME_MANAGEMENT_USE_CASES };

export function buildResumeManagementUseCases(
  prisma: PrismaService,
  eventPublisher: ResumeEventPublisher,
): ResumeManagementUseCases {
  const repository = new ResumeManagementRepository(prisma);

  return {
    listResumesForUserUseCase: new ListResumesForUserUseCase(repository),
    getResumeDetailsUseCase: new GetResumeDetailsUseCase(repository),
    deleteResumeUseCase: new DeleteResumeUseCase(repository, eventPublisher),
  };
}
