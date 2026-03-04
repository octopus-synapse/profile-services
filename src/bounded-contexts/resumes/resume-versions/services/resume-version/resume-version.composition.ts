import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import { RESUME_VERSION_USE_CASES, type ResumeVersionUseCases } from './ports/resume-version.port';
import { ResumeVersionRepository } from './repository/resume-version.repository';
import { CreateSnapshotUseCase } from './use-cases/create-snapshot.use-case';
import { GetVersionsUseCase } from './use-cases/get-versions.use-case';
import { RestoreVersionUseCase } from './use-cases/restore-version.use-case';

export { RESUME_VERSION_USE_CASES };

export function buildResumeVersionUseCases(
  prisma: PrismaService,
  eventPublisher: ResumeEventPublisher,
): ResumeVersionUseCases {
  const repository = new ResumeVersionRepository(prisma);

  const createSnapshotUseCase = new CreateSnapshotUseCase(repository, eventPublisher);

  return {
    createSnapshotUseCase,
    getVersionsUseCase: new GetVersionsUseCase(repository),
    restoreVersionUseCase: new RestoreVersionUseCase(
      repository,
      createSnapshotUseCase,
      eventPublisher,
    ),
  };
}
