/**
 * Pure-TS wiring for the dsl BC. Zero `@nestjs/*` imports — Phase-1
 * canonical shape: returns `{ useCases, routes }` as a
 * `BoundedContextComposition`.
 *
 * All application services (compiler/validator/migration/migrators) are
 * now POJOs and instantiated here.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { DslMigrationService } from './application/migrators/dsl-migration.service';
import { DslV1ToV2Migrator } from './application/migrators/v1-to-v2.migrator';
import { DslUseCases } from './application/ports/dsl.port';
import { DslCompilerService } from './application/services/dsl-compiler.service';
import { DslValidatorService } from './application/services/dsl-validator.service';
import { TokenResolverService } from './application/services/token-resolver.service';
import { PreviewDslUseCase } from './application/use-cases/preview-dsl/preview-dsl.use-case';
import { RenderPublicResumeDslUseCase } from './application/use-cases/render-public-resume-dsl/render-public-resume-dsl.use-case';
import { RenderResumeDslUseCase } from './application/use-cases/render-resume-dsl/render-resume-dsl.use-case';
import { ValidateDslUseCase } from './application/use-cases/validate-dsl/validate-dsl.use-case';
import { dslRoutes } from './dsl.routes';
import { PrismaResumeDslRepository } from './infrastructure/adapters/persistence/prisma-resume-dsl.repository';

export { DslUseCases };

export function buildDslUseCases(prisma: PrismaService, logger: LoggerPort): DslUseCases {
  const validator = new DslValidatorService();
  const tokenResolver = new TokenResolverService();
  const migrationService = new DslMigrationService(logger);
  // Note: keep the migrator wiring here so production parity with the old
  // module is preserved. Tests instantiate `DslMigrationService` directly.
  migrationService.registerMigrators([new DslV1ToV2Migrator(logger)]);
  const compiler = new DslCompilerService(validator, tokenResolver, migrationService);
  const repo = new PrismaResumeDslRepository(prisma);

  return {
    validateDsl: new ValidateDslUseCase(validator),
    previewDsl: new PreviewDslUseCase(compiler),
    renderResumeDsl: new RenderResumeDslUseCase(repo, validator, compiler, logger),
    renderPublicResumeDsl: new RenderPublicResumeDslUseCase(repo, validator, compiler, logger),
  };
}

export function buildDslComposition(
  prisma: PrismaService,
  logger: LoggerPort,
): BoundedContextComposition<DslUseCases> {
  const useCases = buildDslUseCases(prisma, logger);

  return {
    useCases,
    routes: dslRoutes,
  };
}
