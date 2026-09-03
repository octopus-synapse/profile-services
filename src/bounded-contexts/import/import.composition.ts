/**
 * Pure-TS wiring for the import BC. Zero `@nestjs/*` imports — Phase-1
 * canonical shape: returns `{ useCases, routes }` as a
 * `BoundedContextComposition`.
 *
 * `PdfImportService` is
 * now POJOs and instantiated here. The unified `ImportUseCases` bundle
 * exposes both pure use-cases and the stateful adapters consumed by the
 * file-driven multipart/OAuth endpoints.
 */

import type { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { ImportUseCases } from './application/ports/import.port';
import { CancelImportUseCase } from './application/use-cases/cancel-import/cancel-import.use-case';
import { CreateImportJobUseCase } from './application/use-cases/create-import-job/create-import-job.use-case';
import { GetImportStatusUseCase } from './application/use-cases/get-import-status/get-import-status.use-case';
import { ListImportHistoryUseCase } from './application/use-cases/list-import-history/list-import-history.use-case';
import { ProcessImportUseCase } from './application/use-cases/process-import/process-import.use-case';
import { RetryImportUseCase } from './application/use-cases/retry-import/retry-import.use-case';
import { importRoutes } from './import.routes';
import { PdfImportService } from './infrastructure/adapters/pdf-import.service';
import { PrismaImportJobRepository } from './infrastructure/adapters/persistence/import-job.repository';
import { PrismaResumeCreatorAdapter } from './infrastructure/adapters/persistence/resume-creator.adapter';

export { ImportUseCases };

export interface BuildImportDeps {
  readonly prisma: PrismaService;
  readonly logger: LoggerPort;
  readonly llm: LlmPort;
}

export function buildImportUseCases(deps: BuildImportDeps): ImportUseCases {
  const { prisma, logger, llm } = deps;

  // Outbound adapters
  const repository = new PrismaImportJobRepository(prisma, logger);
  const resumeCreator = new PrismaResumeCreatorAdapter(prisma);

  // Stateful POJO adapters consumed by file-driven endpoints
  const pdfImport = new PdfImportService(prisma, llm, logger);

  return {
    createImportJob: new CreateImportJobUseCase(repository),
    processImport: new ProcessImportUseCase(repository, resumeCreator, logger),
    getImportStatus: new GetImportStatusUseCase(repository),
    listImportHistory: new ListImportHistoryUseCase(repository),
    cancelImport: new CancelImportUseCase(repository),
    retryImport: new RetryImportUseCase(repository, resumeCreator, logger),
    pdfImport,
  };
}

export function buildImportComposition(
  deps: BuildImportDeps,
): BoundedContextComposition<ImportUseCases> {
  const useCases = buildImportUseCases(deps);

  return {
    useCases,
    routes: importRoutes,
  };
}
