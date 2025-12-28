/**
 * MEC Sync Module
 * Handles synchronization of Brazilian higher education data from MEC
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MecSyncController } from './mec-sync.controller';
import { MecSyncService } from './services/mec-sync.service';
import { MecQueryService } from './services/mec-query.service';
import { MecCsvParserService } from './services/mec-csv-parser.service';
import { InternalAuthGuard } from './guards/internal-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [MecSyncController],
  providers: [
    MecSyncService,
    MecQueryService,
    MecCsvParserService,
    InternalAuthGuard,
  ],
  exports: [MecSyncService, MecQueryService],
})
export class MecSyncModule {}
