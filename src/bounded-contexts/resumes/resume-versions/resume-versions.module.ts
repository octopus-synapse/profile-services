import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ResumeVersionController } from './controllers/resume-version.controller';
import { ResumeVersionService } from './services/resume-version.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeVersionController],
  providers: [ResumeVersionService],
  exports: [ResumeVersionService],
})
export class ResumeVersionsModule {}
