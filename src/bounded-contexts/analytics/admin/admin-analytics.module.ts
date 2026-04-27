/**
 * Admin Analytics Module
 *
 * ADR-001: the use case is a POJO, so it's wired via useFactory and
 * receives the `AdminAnalyticsRepositoryPort` (Prisma adapter) as its
 * only dependency.
 */

import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { GetAdminAnalyticsOverviewUseCase } from './application/use-cases/get-admin-analytics-overview/get-admin-analytics-overview.use-case';
import { AdminAnalyticsRepositoryPort } from './domain/ports/admin-analytics.repository.port';
import { PrismaAdminAnalyticsRepository } from './infrastructure/adapters/persistence/prisma-admin-analytics.repository';
import { AdminAnalyticsController } from './infrastructure/controllers/admin-analytics.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [AdminAnalyticsController],
  providers: [
    {
      provide: AdminAnalyticsRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaAdminAnalyticsRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: GetAdminAnalyticsOverviewUseCase,
      useFactory: (repo: AdminAnalyticsRepositoryPort) =>
        new GetAdminAnalyticsOverviewUseCase(repo),
      inject: [AdminAnalyticsRepositoryPort],
    },
  ],
})
export class AdminAnalyticsModule {}
