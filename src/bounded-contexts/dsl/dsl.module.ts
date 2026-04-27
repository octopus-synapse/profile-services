/**
 * DSL Module
 * Handles Resume DSL validation, compilation, and transformation.
 *
 * ADR-001: Hexagonal layout. Use cases depend on the
 * `ResumeDslRepositoryPort`; the Prisma adapter is the only thing that
 * knows about persistence shapes. The legacy facade `DslService` /
 * `DslRepository` were retired in favor of dedicated use cases.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { DslMigrationService, DslV1ToV2Migrator } from './application/migrators';
import { DslCompilerService } from './application/services/dsl-compiler.service';
import { DslValidatorService } from './application/services/dsl-validator.service';
import { ThemeDslService } from './application/services/theme-dsl.service';
import { TokenResolverService } from './application/services/token-resolver.service';
import { PreviewDslUseCase } from './application/use-cases/preview-dsl/preview-dsl.use-case';
import { RenderPublicResumeDslUseCase } from './application/use-cases/render-public-resume-dsl/render-public-resume-dsl.use-case';
import { RenderResumeDslUseCase } from './application/use-cases/render-resume-dsl/render-resume-dsl.use-case';
import { ValidateDslUseCase } from './application/use-cases/validate-dsl/validate-dsl.use-case';
import { ResumeDslRepositoryPort } from './domain/ports/resume-dsl.repository.port';
import { PrismaResumeDslRepository } from './infrastructure/adapters/persistence/prisma-resume-dsl.repository';
import { DslController } from './infrastructure/controllers/dsl.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DslController],
  providers: [
    // Application services (compiler, validator, theme, token resolver, migrators)
    DslCompilerService,
    DslValidatorService,
    ThemeDslService,
    TokenResolverService,
    DslMigrationService,
    DslV1ToV2Migrator,
    // Persistence adapter bound to the outbound port
    {
      provide: ResumeDslRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaResumeDslRepository(prisma),
      inject: [PrismaService],
    },
    // Use cases
    {
      provide: ValidateDslUseCase,
      useFactory: (validator: DslValidatorService) => new ValidateDslUseCase(validator),
      inject: [DslValidatorService],
    },
    {
      provide: PreviewDslUseCase,
      useFactory: (compiler: DslCompilerService) => new PreviewDslUseCase(compiler),
      inject: [DslCompilerService],
    },
    {
      provide: RenderResumeDslUseCase,
      useFactory: (
        repo: ResumeDslRepositoryPort,
        validator: DslValidatorService,
        compiler: DslCompilerService,
        logger: LoggerPort,
      ) => new RenderResumeDslUseCase(repo, validator, compiler, logger),
      inject: [ResumeDslRepositoryPort, DslValidatorService, DslCompilerService, LoggerPort],
    },
    {
      provide: RenderPublicResumeDslUseCase,
      useFactory: (
        repo: ResumeDslRepositoryPort,
        validator: DslValidatorService,
        compiler: DslCompilerService,
        logger: LoggerPort,
      ) => new RenderPublicResumeDslUseCase(repo, validator, compiler, logger),
      inject: [ResumeDslRepositoryPort, DslValidatorService, DslCompilerService, LoggerPort],
    },
  ],
  exports: [
    DslCompilerService,
    DslValidatorService,
    ThemeDslService,
    DslMigrationService,
    ResumeDslRepositoryPort,
    RenderResumeDslUseCase,
    RenderPublicResumeDslUseCase,
  ],
})
export class DslModule {}
