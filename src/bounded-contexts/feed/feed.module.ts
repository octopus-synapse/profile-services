/**
 * Feed Module
 *
 * Thin Nest shell over `buildFeedUseCases`. All wiring lives in
 * `feed.composition.ts`. The S3 stateful service is exposed as a
 * Nest provider here so DI can construct it once and pass it into
 * the composition.
 *
 * Every endpoint is now synthesized from `feed.routes.ts` — including
 * the multipart `POST /v1/posts/upload-image` route which uses
 * `kind: 'multipart'` to opt into the synthesizer's `FileInterceptor`
 * wiring.
 */

import { Module } from '@nestjs/common';
import { NotificationsUseCases } from '@/bounded-contexts/notifications/application/ports/notifications.port';
import { NotificationsModule } from '@/bounded-contexts/notifications/notifications.module';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { FeedUseCases } from './application/ports/feed.port';
import { buildFeedUseCases } from './feed.composition';
import { feedRoutes } from './feed.routes';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [...synthesizeRouteControllers(FeedUseCases, feedRoutes)],
  providers: [
    S3UploadService,
    {
      provide: FeedUseCases,
      useFactory: (
        prisma: PrismaService,
        logger: LoggerPort,
        s3: S3UploadService,
        notifications: NotificationsUseCases,
      ) => buildFeedUseCases(prisma, logger, s3, notifications),
      inject: [PrismaService, LoggerPort, S3UploadService, NotificationsUseCases],
    },
  ],
  exports: [FeedUseCases],
})
export class FeedModule {}
