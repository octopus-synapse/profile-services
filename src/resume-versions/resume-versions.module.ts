import { Module } from '@nestjs/common';
import { ResumeVersionController } from './controllers/resume-version.controller';
import { ResumeVersionService } from './services/resume-version.service';
import { ResumeVersionRepository } from './repositories';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeVersionController],
  providers: [ResumeVersionService, ResumeVersionRepository],
  exports: [ResumeVersionService],
})
export class ResumeVersionsModule {}
