import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { EventPublisher } from '@/shared-kernel/event-bus/event-publisher';
import { PublicResumesHttpBundle } from './application/ports/public-resumes.bundle';
import { AccessPublicResumeUseCase } from './application/use-cases/access-public-resume.use-case';
import { publicResumesRoutes } from './public-resumes.routes';
import { OgImageService } from './services/og-image.service';
import { QrCodeService } from './services/qr-code.service';
import { ResumeShareService } from './services/resume-share.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [...synthesizeRouteControllers(PublicResumesHttpBundle, publicResumesRoutes)],
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
    {
      provide: PublicResumesHttpBundle,
      useFactory: (
        shareService: ResumeShareService,
        accessResume: AccessPublicResumeUseCase,
        ogImageService: OgImageService,
        qrCodeService: QrCodeService,
        config: ConfigService,
      ): PublicResumesHttpBundle => ({
        shareService,
        accessResume,
        ogImageService,
        qrCodeService,
        publicAppUrl: config.get<string>('PUBLIC_APP_URL') ?? 'https://patchcareers.com',
      }),
      inject: [
        ResumeShareService,
        AccessPublicResumeUseCase,
        OgImageService,
        QrCodeService,
        ConfigService,
      ],
    },
  ],
  exports: [ResumeShareService, QrCodeService, OgImageService],
})
export class PublicResumesModule {}
