import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { RESUME_EVENT_PUBLISHER } from '@/bounded-contexts/resumes/domain/ports';
import { ResumeVersionController } from './controllers/resume-version.controller';
import {
  buildResumeVersionUseCases,
  RESUME_VERSION_USE_CASES,
} from './services/resume-version/resume-version.composition';
import { ResumeVersionService } from './services/resume-version.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeVersionController],
  providers: [
    ResumeVersionService,
    {
      provide: RESUME_VERSION_USE_CASES,
      useFactory: buildResumeVersionUseCases,
      inject: [PrismaService, RESUME_EVENT_PUBLISHER],
    },
  ],
  exports: [ResumeVersionService],
})
export class ResumeVersionsModule {}
