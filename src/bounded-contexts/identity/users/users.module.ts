import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumesCoreModule } from '@/bounded-contexts/resumes/core/resumes.module';
import { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import { LoggerPort } from '@/shared-kernel';
import { UserManagementUseCases } from './application/ports/user-management.port';
import { UserPreferencesUseCases } from './application/ports/user-preferences.port';
import { UserProfileUseCases } from './application/ports/user-profile.port';
import { UsernameUseCases } from './application/ports/username.port';
import { UserManagementService, UsernameService } from './application/services';
import { buildUserManagementUseCases } from './application/user-management.composition';
import { buildUserPreferencesUseCases } from './application/user-preferences.composition';
import { buildUserProfileUseCases } from './application/user-profile.composition';
import { buildUsernameUseCases } from './application/username.composition';
import {
  UserMutationRepository,
  UserQueryRepository,
  UsersRepository,
} from './infrastructure/adapters/persistence';
import {
  UserManagementController,
  UserPermissionsController,
  UsersPreferencesController,
  UsersProfileController,
} from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, ResumesCoreModule, LoggerModule, AuthorizationModule],
  controllers: [
    UsersProfileController,
    UsersPreferencesController,
    UserManagementController,
    UserPermissionsController,
  ],
  providers: [
    // Use Cases
    {
      provide: UserProfileUseCases,
      useFactory: (prisma: PrismaService, resumesRepo: ResumesRepository) =>
        buildUserProfileUseCases(prisma, resumesRepo),
      inject: [PrismaService, ResumesRepository],
    },
    {
      provide: UserPreferencesUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildUserPreferencesUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: UsernameUseCases,
      useFactory: (prisma: PrismaService) => buildUsernameUseCases(prisma),
      inject: [PrismaService],
    },
    {
      provide: UserManagementUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildUserManagementUseCases(
          prisma,
          (password: string) => Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 }),
          logger,
        ),
      inject: [PrismaService, LoggerPort],
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
