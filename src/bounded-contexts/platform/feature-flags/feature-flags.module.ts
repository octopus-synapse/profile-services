import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { AuditLogModule } from '@/bounded-contexts/platform/common/audit/audit-log.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { FeatureFlagsUseCases } from './application/ports/feature-flags.port';
import { FeatureFlagService } from './application/services/feature-flag.service';
import { FlagStateService } from './application/services/flag-state.service';
import { BootstrapFlagsUseCase } from './application/use-cases/bootstrap-flags.use-case';
import { BroadcastRefreshUseCase } from './application/use-cases/broadcast-refresh.use-case';
import { EvaluateFlagsUseCase } from './application/use-cases/evaluate-flags.use-case';
import { ImpactAnalysisUseCase } from './application/use-cases/impact-analysis.use-case';
import { ListFlagsUseCase } from './application/use-cases/list-flags.use-case';
import { ToggleFlagUseCase } from './application/use-cases/toggle-flag.use-case';
import { FeatureFlagRepositoryPort } from './domain/ports/feature-flag.repository.port';
import {
  FeatureFlagsSseBundle,
  featureFlagsRoutes,
  featureFlagsSseRoutes,
} from './feature-flags.routes';
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
  controllers: [
    ...synthesizeRouteControllers(FeatureFlagsUseCases, featureFlagsRoutes),
    ...synthesizeRouteControllers(FeatureFlagsSseBundle, featureFlagsSseRoutes),
  ],
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
    {
      provide: FeatureFlagsUseCases,
      useFactory: (
        listFlags: ListFlagsUseCase,
        toggleFlag: ToggleFlagUseCase,
        impactAnalysis: ImpactAnalysisUseCase,
        broadcastRefresh: BroadcastRefreshUseCase,
        featureFlagService: FeatureFlagService,
      ): FeatureFlagsUseCases => ({
        listFlags,
        toggleFlag,
        impactAnalysis,
        broadcastRefresh,
        featureFlagService,
      }),
      inject: [
        ListFlagsUseCase,
        ToggleFlagUseCase,
        ImpactAnalysisUseCase,
        BroadcastRefreshUseCase,
        FeatureFlagService,
      ],
    },
    {
      provide: FeatureFlagsSseBundle,
      useFactory: (flagStream: SseFlagStream): FeatureFlagsSseBundle => ({ flagStream }),
      inject: [SseFlagStream],
    },
  ],
  exports: [FeatureFlagService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
