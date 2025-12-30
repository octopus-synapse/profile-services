import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import {
  UserProfileService,
  UserPreferencesService,
  UsernameService,
} from './services';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumesModule } from '../resumes/resumes.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [PrismaModule, ResumesModule, LoggerModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    UserProfileService,
    UserPreferencesService,
    UsernameService,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
