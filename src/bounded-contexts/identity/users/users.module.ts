import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '@/bounded-contexts/identity/auth/auth.module';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
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
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [
    PrismaModule,
    ResumesModule,
    LoggerModule,
    AuthorizationModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersProfileController, UsersPreferencesController, UserManagementController],
  providers: [
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
