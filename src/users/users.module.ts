import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UsersProfileController,
  UsersPreferencesController,
} from './controllers';
import { UsersRepository } from './users.repository';
import {
  UserProfileService,
  UserPreferencesService,
  UsernameService,
} from './services';
import { UserQueryRepository, UserMutationRepository } from './repositories';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumesModule } from '../resumes/resumes.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [PrismaModule, ResumesModule, LoggerModule],
  controllers: [UsersProfileController, UsersPreferencesController],
  providers: [
    UsersService,
    UsersRepository,
    UserQueryRepository,
    UserMutationRepository,
    UserProfileService,
    UserPreferencesService,
    UsernameService,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
