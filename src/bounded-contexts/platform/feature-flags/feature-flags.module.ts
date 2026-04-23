import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { AuditLogModule } from '@/bounded-contexts/platform/common/audit/audit-log.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { FeatureFlagService } from './application/services/feature-flag.service';
import { FlagStateService } from './application/services/flag-state.service';
import { BootstrapFlagsUseCase } from './application/use-cases/bootstrap-flags.use-case';
import { BroadcastRefreshUseCase } from './application/use-cases/broadcast-refresh.use-case';
import { EvaluateFlagsUseCase } from './application/use-cases/evaluate-flags.use-case';
import { ImpactAnalysisUseCase } from './application/use-cases/impact-analysis.use-case';
import { ListFlagsUseCase } from './application/use-cases/list-flags.use-case';
import { ToggleFlagUseCase } from './application/use-cases/toggle-flag.use-case';
import { AdminFeatureFlagsController } from './controllers/admin-feature-flags.controller';
import { FeatureFlagsController } from './controllers/feature-flags.controller';
import { FeatureFlagRepositoryPort } from './domain/ports/feature-flag.repository.port';
import { RedisFlagCache } from './infrastructure/cache/redis-flag-cache.service';
import { FeatureFlagGuard } from './infrastructure/guards/feature-flag.guard';
import { PrismaFeatureFlagRepository } from './infrastructure/repositories/prisma-feature-flag.repository';
import { SseFlagStream } from './infrastructure/sse/sse-flag-stream.service';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    LoggerModule,
    AuditLogModule,
    AuthorizationModule,
    EventBusModule,
  ],
  controllers: [FeatureFlagsController, AdminFeatureFlagsController],
  providers: [
    { provide: FeatureFlagRepositoryPort, useClass: PrismaFeatureFlagRepository },
    RedisFlagCache,
    SseFlagStream,
    FlagStateService,
    EvaluateFlagsUseCase,
    ToggleFlagUseCase,
    ImpactAnalysisUseCase,
    ListFlagsUseCase,
    BootstrapFlagsUseCase,
    BroadcastRefreshUseCase,
    FeatureFlagService,
    FeatureFlagGuard,
  ],
  exports: [FeatureFlagService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
