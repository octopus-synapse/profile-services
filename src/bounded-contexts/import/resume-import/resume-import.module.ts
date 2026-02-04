/**
 * Resume Import Module
 *
 * Provides resume import functionality for JSON Resume format.
 *
 * Martin Fowler: "Modules encapsulate cohesive functionality"
 */

import { Module } from '@nestjs/common';
import { ResumeImportController } from './resume-import.controller';
import { ResumeImportService } from './resume-import.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [ResumeImportController],
  providers: [ResumeImportService],
  exports: [ResumeImportService],
})
export class ResumeImportModule {}
