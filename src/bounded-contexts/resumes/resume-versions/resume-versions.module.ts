import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeVersionServicePort } from '@/bounded-contexts/resumes/core/ports/resume-version-service.port';
import { RESUME_EVENT_PUBLISHER } from '@/bounded-contexts/resumes/domain/ports';
import { ResumeEventPublisherAdapter } from '@/bounded-contexts/resumes/infrastructure/adapters';
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
      provide: ResumeVersionServicePort,
      useExisting: ResumeVersionService,
    },
    {
      provide: RESUME_EVENT_PUBLISHER,
      useClass: ResumeEventPublisherAdapter,
    },
    {
      provide: RESUME_VERSION_USE_CASES,
      useFactory: buildResumeVersionUseCases,
      inject: [PrismaService, RESUME_EVENT_PUBLISHER],
    },
  ],
  exports: [ResumeVersionService, ResumeVersionServicePort, RESUME_EVENT_PUBLISHER],
})
export class ResumeVersionsModule {}
