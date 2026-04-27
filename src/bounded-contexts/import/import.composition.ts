/**
 * Pure-TS wiring for the import BC. Zero `@nestjs/*` imports.
 *
 * `PdfImportService` and `GithubImportService` are stateful Nest
 * services that stay in the module — they're injected directly into
 * the controller alongside the bundle.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { ImportUseCases } from './application/ports/import.port';
import { CancelImportUseCase } from './application/use-cases/cancel-import/cancel-import.use-case';
import { CreateImportJobUseCase } from './application/use-cases/create-import-job/create-import-job.use-case';
import { GetImportStatusUseCase } from './application/use-cases/get-import-status/get-import-status.use-case';
import { ImportGithubUseCase } from './application/use-cases/import-github/import-github.use-case';
import type { GithubApiPort } from './application/use-cases/import-github/github-api.port';
import { ListImportHistoryUseCase } from './application/use-cases/list-import-history/list-import-history.use-case';
import { ProcessImportUseCase } from './application/use-cases/process-import/process-import.use-case';
import { RetryImportUseCase } from './application/use-cases/retry-import/retry-import.use-case';
import { PrismaImportJobRepository } from './infrastructure/adapters/persistence/import-job.repository';
import { PrismaResumeCreatorAdapter } from './infrastructure/adapters/persistence/resume-creator.adapter';

export { ImportUseCases };

export function buildImportUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  githubApi: GithubApiPort,
): ImportUseCases {
  // Outbound adapters
  const repository = new PrismaImportJobRepository(prisma, logger);
  const resumeCreator = new PrismaResumeCreatorAdapter(prisma);

  return {
    createImportJob: new CreateImportJobUseCase(repository),
    processImport: new ProcessImportUseCase(repository, resumeCreator, logger),
    getImportStatus: new GetImportStatusUseCase(repository),
    listImportHistory: new ListImportHistoryUseCase(repository),
    cancelImport: new CancelImportUseCase(repository),
    retryImport: new RetryImportUseCase(repository, resumeCreator, logger),
    importGithub: new ImportGithubUseCase(githubApi),
  };
}
