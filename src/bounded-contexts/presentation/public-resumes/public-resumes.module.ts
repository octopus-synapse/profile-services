import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PublicResumeController } from './controllers/public-resume.controller';
import { ShareManagementController } from './controllers/share-management.controller';
import { QrCodeService } from './services/qr-code.service';
import { ResumeShareService } from './services/resume-share.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [PublicResumeController, ShareManagementController],
  providers: [ResumeShareService, QrCodeService],
  exports: [ResumeShareService, QrCodeService],
})
export class PublicResumesModule {}
