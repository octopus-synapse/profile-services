import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UsersProfileController,
  UsersPreferencesController,
  UserManagementController,
} from './controllers';
import { UsersRepository } from './users.repository';
import {
  UserProfileService,
  UserPreferencesService,
  UsernameService,
  UserManagementService,
} from './services';
import { UserQueryRepository, UserMutationRepository } from './repositories';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumesModule } from '../resumes/resumes.module';
import { LoggerModule } from '../common/logger/logger.module';
import { AuthorizationModule } from '../authorization';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    ResumesModule,
    LoggerModule,
    AuthorizationModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [
    UsersProfileController,
    UsersPreferencesController,
    UserManagementController,
  ],
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
