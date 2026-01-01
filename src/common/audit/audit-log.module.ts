import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../logger/logger.module';

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
