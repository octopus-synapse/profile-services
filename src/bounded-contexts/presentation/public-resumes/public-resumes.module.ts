import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { LoggerPort } from '@/shared-kernel';
import { EventPublisher } from '@/shared-kernel/event-bus/event-publisher';
import { AccessPublicResumeUseCase } from './application/use-cases/access-public-resume.use-case';
import { PublicResumeController } from './controllers/public-resume.controller';
import { ShareManagementController } from './controllers/share-management.controller';
import { OgImageService } from './services/og-image.service';
import { QrCodeService } from './services/qr-code.service';
import { ResumeShareService } from './services/resume-share.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [PublicResumeController, ShareManagementController],
  providers: [
    ResumeShareService,
    QrCodeService,
    OgImageService,
    {
      provide: AccessPublicResumeUseCase,
      useFactory: (shares: ResumeShareService, events: EventPublisher, logger: LoggerPort) =>
        new AccessPublicResumeUseCase(shares, events, logger),
      inject: [ResumeShareService, EventPublisher, LoggerPort],
    },
  ],
  exports: [ResumeShareService, QrCodeService, OgImageService],
})
export class PublicResumesModule {}
