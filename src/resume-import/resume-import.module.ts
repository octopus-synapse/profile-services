/**
 * Resume Import Module
 *
 * Provides resume import functionality for JSON Resume format.
 *
 * Martin Fowler: "Modules encapsulate cohesive functionality"
 */

import { Module } from '@nestjs/common';
import { ResumeImportService } from './resume-import.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [ResumeImportService],
  exports: [ResumeImportService],
})
export class ResumeImportModule {}
