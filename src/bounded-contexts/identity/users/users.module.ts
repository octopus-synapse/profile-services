import { Module } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumesModule } from '@/bounded-contexts/resumes/resumes/resumes.module';
import {
  UserManagementController,
  UsersPreferencesController,
  UsersProfileController,
} from './controllers';
import { UserMutationRepository, UserQueryRepository } from './repositories';
import {
  UserManagementService,
  UsernameService,
  UserPreferencesService,
  UserProfileService,
} from './services';
import {
  buildUserManagementUseCases,
  USER_MANAGEMENT_USE_CASES,
} from './services/user-management/user-management.composition';
import {
  buildUserPreferencesUseCases,
  USER_PREFERENCES_USE_CASES,
} from './services/user-preferences/user-preferences.composition';
import {
  buildUsernameUseCases,
  USERNAME_USE_CASES,
} from './services/username/username.composition';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

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
