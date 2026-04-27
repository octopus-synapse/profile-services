/**
 * Bundle token for the import BC. Doubles as the TypeScript shape of
 * the use-case bag and the Nest DI token. Composition lives in
 * `import.composition.ts` — Nest-free.
 */

import type { CancelImportUseCase } from '../use-cases/cancel-import/cancel-import.use-case';
import type { CreateImportJobUseCase } from '../use-cases/create-import-job/create-import-job.use-case';
import type { GetImportStatusUseCase } from '../use-cases/get-import-status/get-import-status.use-case';
import type { ImportGithubUseCase } from '../use-cases/import-github/import-github.use-case';
import type { ListImportHistoryUseCase } from '../use-cases/list-import-history/list-import-history.use-case';
import type { ProcessImportUseCase } from '../use-cases/process-import/process-import.use-case';
import type { RetryImportUseCase } from '../use-cases/retry-import/retry-import.use-case';

export abstract class ImportUseCases {
  abstract readonly createImportJob: CreateImportJobUseCase;
  abstract readonly processImport: ProcessImportUseCase;
  abstract readonly getImportStatus: GetImportStatusUseCase;
  abstract readonly listImportHistory: ListImportHistoryUseCase;
  abstract readonly cancelImport: CancelImportUseCase;
  abstract readonly retryImport: RetryImportUseCase;
  abstract readonly importGithub: ImportGithubUseCase;
}
