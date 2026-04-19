/**
 * Import Module
 *
 * Hexagonal Architecture (ADR-001) - Flat structure.
 * Wires domain ports to infrastructure adapters via NestJS DI.
 */

import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { OAuthModule } from '@/bounded-contexts/identity/oauth/oauth.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
// Use Cases
import { CancelImportUseCase } from './application/use-cases/cancel-import/cancel-import.use-case';
import { CreateImportJobUseCase } from './application/use-cases/create-import-job/create-import-job.use-case';
import { GetImportStatusUseCase } from './application/use-cases/get-import-status/get-import-status.use-case';
import { GITHUB_API_PORT } from './application/use-cases/import-github/github-api.port';
import { ImportGithubUseCase } from './application/use-cases/import-github/import-github.use-case';
import { ListImportHistoryUseCase } from './application/use-cases/list-import-history/list-import-history.use-case';
import { ProcessImportUseCase } from './application/use-cases/process-import/process-import.use-case';
import { RetryImportUseCase } from './application/use-cases/retry-import/retry-import.use-case';
// Domain Ports
import { IMPORT_JOB_REPOSITORY } from './domain/ports/import-job.repository.port';
import { RESUME_CREATOR } from './domain/ports/resume-creator.port';
// Infrastructure Adapters
import { GithubApiAdapter } from './infrastructure/adapters/github-api.adapter';
import { GithubImportService } from './infrastructure/adapters/github-import.service';
import { PdfImportService } from './infrastructure/adapters/pdf-import.service';
import { PrismaImportJobRepository } from './infrastructure/adapters/persistence/import-job.repository';
import { PrismaResumeCreatorAdapter } from './infrastructure/adapters/persistence/resume-creator.adapter';
import { GithubImportController } from './infrastructure/controllers/github-import.controller';

// Controller
import {
  CANCEL_IMPORT,
  CREATE_IMPORT_JOB,
  GET_IMPORT_STATUS,
  LIST_IMPORT_HISTORY,
  PROCESS_IMPORT,
  RETRY_IMPORT,
  ResumeImportController,
} from './infrastructure/controllers/resume-import.controller';

@Module({
  imports: [PrismaModule, LoggerModule, AiModule, OAuthModule],
  controllers: [ResumeImportController, GithubImportController],
  providers: [
    // Outbound Adapters
    { provide: IMPORT_JOB_REPOSITORY, useClass: PrismaImportJobRepository },
    { provide: RESUME_CREATOR, useClass: PrismaResumeCreatorAdapter },
    { provide: GITHUB_API_PORT, useClass: GithubApiAdapter },
    PdfImportService,
    GithubImportService,
    ImportGithubUseCase,

    // Use Cases (inbound ports)
    {
      provide: CREATE_IMPORT_JOB,
      useFactory: (repo: PrismaImportJobRepository) => new CreateImportJobUseCase(repo),
      inject: [IMPORT_JOB_REPOSITORY],
    },
    {
      provide: PROCESS_IMPORT,
      useFactory: (repo: PrismaImportJobRepository, creator: PrismaResumeCreatorAdapter) =>
        new ProcessImportUseCase(repo, creator),
      inject: [IMPORT_JOB_REPOSITORY, RESUME_CREATOR],
    },
    {
      provide: GET_IMPORT_STATUS,
      useFactory: (repo: PrismaImportJobRepository) => new GetImportStatusUseCase(repo),
      inject: [IMPORT_JOB_REPOSITORY],
    },
    {
      provide: LIST_IMPORT_HISTORY,
      useFactory: (repo: PrismaImportJobRepository) => new ListImportHistoryUseCase(repo),
      inject: [IMPORT_JOB_REPOSITORY],
    },
    {
      provide: CANCEL_IMPORT,
      useFactory: (repo: PrismaImportJobRepository) => new CancelImportUseCase(repo),
      inject: [IMPORT_JOB_REPOSITORY],
    },
    {
      provide: RETRY_IMPORT,
      useFactory: (repo: PrismaImportJobRepository, creator: PrismaResumeCreatorAdapter) =>
        new RetryImportUseCase(repo, creator),
      inject: [IMPORT_JOB_REPOSITORY, RESUME_CREATOR],
    },
  ],
  exports: [
    CREATE_IMPORT_JOB,
    PROCESS_IMPORT,
    GET_IMPORT_STATUS,
    LIST_IMPORT_HISTORY,
    CANCEL_IMPORT,
    RETRY_IMPORT,
  ],
})
export class ImportModule {}
