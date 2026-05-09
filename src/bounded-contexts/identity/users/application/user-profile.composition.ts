import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import { UserProfileRepository } from '../infrastructure/adapters/persistence/user-profile.repository';
import { UserProfileUseCases } from './ports/user-profile.port';
import { GetProfileUseCase } from './use-cases/user-profile/get-profile.use-case';
import { GetPublicProfileUseCase } from './use-cases/user-profile/get-public-profile.use-case';
import { ListPublicUsersUseCase } from './use-cases/user-profile/list-public-users.use-case';
import { UpdateProfileUseCase } from './use-cases/user-profile/update-profile.use-case';

export { UserProfileUseCases };

export function buildUserProfileUseCases(
  prisma: PrismaService,
  resumesRepository: ResumesRepository,
): UserProfileUseCases {
  const repository = new UserProfileRepository(prisma, resumesRepository);

  return {
    getPublicProfileUseCase: new GetPublicProfileUseCase(repository),
    getProfileUseCase: new GetProfileUseCase(repository),
    updateProfileUseCase: new UpdateProfileUseCase(repository),
    listPublicUsersUseCase: new ListPublicUsersUseCase(repository),
  };
}
