/**
 * Pure-TS wiring for the dsl BC. Zero `@nestjs/*` imports.
 *
 * Stateful application services (compiler/validator/migration) stay
 * Nest-decorated providers in `dsl.module.ts` — composition takes them
 * as parameters so the singleton lifecycle stays with Nest while the
 * use-case graph is framework-free.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { DslUseCases } from './application/ports/dsl.port';
import type { DslCompilerService } from './application/services/dsl-compiler.service';
import type { DslValidatorService } from './application/services/dsl-validator.service';
import { PreviewDslUseCase } from './application/use-cases/preview-dsl/preview-dsl.use-case';
import { RenderPublicResumeDslUseCase } from './application/use-cases/render-public-resume-dsl/render-public-resume-dsl.use-case';
import { RenderResumeDslUseCase } from './application/use-cases/render-resume-dsl/render-resume-dsl.use-case';
import { ValidateDslUseCase } from './application/use-cases/validate-dsl/validate-dsl.use-case';
import { PrismaResumeDslRepository } from './infrastructure/adapters/persistence/prisma-resume-dsl.repository';

export { DslUseCases };

export function buildDslUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  validator: DslValidatorService,
  compiler: DslCompilerService,
): DslUseCases {
  const repo = new PrismaResumeDslRepository(prisma);

  return {
    validateDsl: new ValidateDslUseCase(validator),
    previewDsl: new PreviewDslUseCase(compiler),
    renderResumeDsl: new RenderResumeDslUseCase(repo, validator, compiler, logger),
    renderPublicResumeDsl: new RenderPublicResumeDslUseCase(repo, validator, compiler, logger),
  };
}
