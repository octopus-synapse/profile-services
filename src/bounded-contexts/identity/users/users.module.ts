import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumesCoreModule } from '@/bounded-contexts/resumes/core/resumes.module';
import { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import { UserManagementService, UsernameService } from './application/services';
import {
  buildUserManagementUseCases,
  USER_MANAGEMENT_USE_CASES,
} from './application/user-management.composition';
import {
  buildUserPreferencesUseCases,
  USER_PREFERENCES_USE_CASES,
} from './application/user-preferences.composition';
import {
  buildUserProfileUseCases,
  USER_PROFILE_USE_CASES,
} from './application/user-profile.composition';
import { buildUsernameUseCases, USERNAME_USE_CASES } from './application/username.composition';
import {
  UserMutationRepository,
  UserQueryRepository,
  UsersRepository,
} from './infrastructure/adapters/persistence';
import {
  UserManagementController,
  UsersPreferencesController,
  UsersProfileController,
} from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, ResumesCoreModule, LoggerModule, AuthorizationModule],
  controllers: [UsersProfileController, UsersPreferencesController, UserManagementController],
  providers: [
    // Use Cases
    {
      provide: USER_PROFILE_USE_CASES,
      useFactory: (prisma: PrismaService, resumesRepo: ResumesRepository) =>
        buildUserProfileUseCases(prisma, resumesRepo),
      inject: [PrismaService, ResumesRepository],
    },
    {
      provide: USER_PREFERENCES_USE_CASES,
      useFactory: (prisma: PrismaService) => buildUserPreferencesUseCases(prisma),
      inject: [PrismaService],
    },
    {
      provide: USERNAME_USE_CASES,
      useFactory: (prisma: PrismaService) => buildUsernameUseCases(prisma),
      inject: [PrismaService],
    },
    {
      provide: USER_MANAGEMENT_USE_CASES,
      useFactory: (prisma: PrismaService) =>
        buildUserManagementUseCases(prisma, (password: string) =>
          Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 }),
        ),
      inject: [PrismaService],
    },

    // Services with real domain logic (not pure facades)
    UsernameService,
    UserManagementService,

    // Repositories
    UsersRepository,
    UserQueryRepository,
    UserMutationRepository,
  ],
  exports: [UsersRepository, UserManagementService],
})
export class UsersModule {}
