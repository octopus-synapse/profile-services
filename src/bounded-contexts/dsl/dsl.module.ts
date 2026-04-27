/**
 * DSL Module
 *
 * Thin Nest shell over `buildDslUseCases`. Stateful Nest-decorated
 * services (compiler, validator, theme, token resolver, migrators)
 * stay registered here and are handed into the composition.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { DslMigrationService, DslV1ToV2Migrator } from './application/migrators';
import { DslUseCases } from './application/ports/dsl.port';
import { DslCompilerService } from './application/services/dsl-compiler.service';
import { DslValidatorService } from './application/services/dsl-validator.service';
import { ThemeDslService } from './application/services/theme-dsl.service';
import { TokenResolverService } from './application/services/token-resolver.service';
import { buildDslUseCases } from './dsl.composition';
import { dslRoutes } from './dsl.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(DslUseCases, dslRoutes),
  providers: [
    // Application services (compiler, validator, theme, token resolver, migrators)
    DslCompilerService,
    DslValidatorService,
    ThemeDslService,
    TokenResolverService,
    DslMigrationService,
    DslV1ToV2Migrator,
    {
      provide: DslUseCases,
      useFactory: (
        prisma: PrismaService,
        logger: LoggerPort,
        validator: DslValidatorService,
        compiler: DslCompilerService,
      ) => buildDslUseCases(prisma, logger, validator, compiler),
      inject: [PrismaService, LoggerPort, DslValidatorService, DslCompilerService],
    },
  ],
  exports: [
    DslCompilerService,
    DslValidatorService,
    ThemeDslService,
    DslMigrationService,
    DslUseCases,
  ],
})
export class DslModule {}
