import { Module } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumesModule } from '@/bounded-contexts/resumes/resumes/resumes.module';
import {
  UserManagementService,
  UsernameService,
  UserPreferencesService,
  UserProfileService,
  UsersService,
} from './application/services';
import {
  buildUserManagementUseCases,
  USER_MANAGEMENT_USE_CASES,
} from './application/user-management.composition';
import {
  buildUserPreferencesUseCases,
  USER_PREFERENCES_USE_CASES,
} from './application/user-preferences.composition';
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
  imports: [PrismaModule, ResumesModule, LoggerModule, AuthorizationModule],
  controllers: [UsersProfileController, UsersPreferencesController, UserManagementController],
  providers: [
    // Use Cases (Clean Architecture)
    {
      provide: USER_MANAGEMENT_USE_CASES,
      useFactory: (prisma: PrismaService) =>
        buildUserManagementUseCases(prisma, (password: string) => bcrypt.hash(password, 12)),
      inject: [PrismaService],
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
    // Services (Facades)
    UsersService,
    UsersRepository,
    UserQueryRepository,
    UserMutationRepository,
    UserProfileService,
    UserPreferencesService,
    UsernameService,
    UserManagementService,
  ],
  exports: [UsersService, UsersRepository, UserManagementService],
})
export class UsersModule {}
