import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { LoggerModule } from '../logger/logger.module';
import { AuditLogService } from './audit-log.service';

/**
 * Global module for audit logging
 * Can be injected anywhere without importing the module
 */
@Global()
@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
