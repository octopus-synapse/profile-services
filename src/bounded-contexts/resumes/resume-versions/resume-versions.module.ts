import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { FitProfileModule } from '@/bounded-contexts/fit-profile/fit-profile.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeQualityModule } from '@/bounded-contexts/resume-quality/resume-quality.module';
import { ResumeVersionServicePort } from '@/bounded-contexts/resumes/core/ports/resume-version-service.port';
import { ResumeEventPublisherAdapter } from '@/bounded-contexts/resumes/infrastructure/adapters';
import { EventPublisher } from '@/shared-kernel';
import { ResumeEventPublisher } from '../domain/ports/resume-event-publisher.port';
import { ResumeTailorController } from './controllers/resume-tailor.controller';
import { ResumeVersionController } from './controllers/resume-version.controller';
import { ResumeTailorService } from './services/resume-tailor/resume-tailor.service';
import { ResumeVersionUseCases } from './services/resume-version/ports/resume-version.port';
import { buildResumeVersionUseCases } from './services/resume-version/resume-version.composition';
import { ResumeVersionService } from './services/resume-version.service';

@Module({
  imports: [PrismaModule, AiModule, FitProfileModule, ResumeQualityModule],
  controllers: [ResumeVersionController, ResumeTailorController],
  providers: [
    {
      provide: ResumeVersionService,
      useFactory: (useCases: ResumeVersionUseCases) => new ResumeVersionService(useCases),
      inject: [ResumeVersionUseCases],
    },
    {
      provide: ResumeTailorService,
      useFactory: (prisma: PrismaService, llm: LlmPort) => new ResumeTailorService(prisma, llm),
      inject: [PrismaService, LlmPort],
    },
    { provide: ResumeVersionServicePort, useExisting: ResumeVersionService },
    {
      provide: ResumeEventPublisher,
      useFactory: (eventPublisher: EventPublisher) =>
        new ResumeEventPublisherAdapter(eventPublisher),
      inject: [EventPublisher],
    },
    {
      provide: ResumeVersionUseCases,
      useFactory: buildResumeVersionUseCases,
      inject: [PrismaService, ResumeEventPublisher],
    },
  ],
  exports: [
    ResumeVersionService,
    ResumeVersionServicePort,
    ResumeTailorService,
    ResumeEventPublisher,
  ],
})
export class ResumeVersionsModule {}
