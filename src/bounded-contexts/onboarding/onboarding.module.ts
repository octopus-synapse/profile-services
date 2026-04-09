/**
 * Onboarding Module
 *
 * ADR-001: Flat Hexagonal Architecture.
 * Session/Commands API for backend-driven onboarding flow.
 */

import { Module } from '@nestjs/common';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  buildOnboardingUseCases,
  ONBOARDING_USE_CASES,
} from './application/compositions/onboarding.composition';
import {
  buildOnboardingProgressUseCases,
  ONBOARDING_PROGRESS_USE_CASES,
} from './application/compositions/onboarding-progress.composition';
import { OnboardingController } from './infrastructure/controllers/onboarding.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController],
  providers: [
    {
      provide: ONBOARDING_PROGRESS_USE_CASES,
      useFactory: (prisma: PrismaService) => buildOnboardingProgressUseCases(prisma),
      inject: [PrismaService],
    },
    {
      provide: ONBOARDING_USE_CASES,
      useFactory: (prisma: PrismaService, logger: AppLoggerService, auditLog: AuditLogService) =>
        buildOnboardingUseCases(prisma, logger, auditLog),
      inject: [PrismaService, AppLoggerService, AuditLogService],
    },
  ],
  exports: [ONBOARDING_USE_CASES],
})
export class OnboardingModule {}
