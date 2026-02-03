import { Module } from '@nestjs/common';
import { ResumeVersionController } from './controllers/resume-version.controller';
import { ResumeVersionService } from './services/resume-version.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeVersionController],
  providers: [ResumeVersionService],
  exports: [ResumeVersionService],
})
export class ResumeVersionsModule {}
