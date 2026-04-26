/**
 * Import Module — Composition Root
 *
 * Hexagonal Architecture (ADR-001) - Flat structure.
 * Wires domain ports to infrastructure adapters via NestJS DI, using
 * abstract classes as DI tokens (no Symbols).
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
import { GithubApiPort } from './application/use-cases/import-github/github-api.port';
import { ImportGithubUseCase } from './application/use-cases/import-github/import-github.use-case';
import { ListImportHistoryUseCase } from './application/use-cases/list-import-history/list-import-history.use-case';
import { ProcessImportUseCase } from './application/use-cases/process-import/process-import.use-case';
import { RetryImportUseCase } from './application/use-cases/retry-import/retry-import.use-case';
// Domain Ports
import { ImportJobRepositoryPort } from './domain/ports/import-job.repository.port';
import { ResumeCreatorPort } from './domain/ports/resume-creator.port';
// Infrastructure Adapters
import { GithubApiAdapter } from './infrastructure/adapters/github-api.adapter';
import { GithubImportService } from './infrastructure/adapters/github-import.service';
import { PdfImportService } from './infrastructure/adapters/pdf-import.service';
import { PrismaImportJobRepository } from './infrastructure/adapters/persistence/import-job.repository';
import { PrismaResumeCreatorAdapter } from './infrastructure/adapters/persistence/resume-creator.adapter';
import { GithubImportController } from './infrastructure/controllers/github-import.controller';
import { ResumeImportController } from './infrastructure/controllers/resume-import.controller';

@Module({
  imports: [PrismaModule, LoggerModule, AiModule, OAuthModule],
  controllers: [ResumeImportController, GithubImportController],
  providers: [
    // Outbound Adapters
    { provide: ImportJobRepositoryPort, useClass: PrismaImportJobRepository },
    { provide: ResumeCreatorPort, useClass: PrismaResumeCreatorAdapter },
    { provide: GithubApiPort, useClass: GithubApiAdapter },
    PdfImportService,
    GithubImportService,
    {
      provide: ImportGithubUseCase,
      useFactory: (api: GithubApiPort) => new ImportGithubUseCase(api),
      inject: [GithubApiPort],
    },
    // Use Cases — class-as-token
    {
      provide: CreateImportJobUseCase,
      useFactory: (repo: ImportJobRepositoryPort) => new CreateImportJobUseCase(repo),
      inject: [ImportJobRepositoryPort],
    },
    {
      provide: ProcessImportUseCase,
      useFactory: (repo: ImportJobRepositoryPort, creator: ResumeCreatorPort) =>
        new ProcessImportUseCase(repo, creator),
      inject: [ImportJobRepositoryPort, ResumeCreatorPort],
    },
    {
      provide: GetImportStatusUseCase,
      useFactory: (repo: ImportJobRepositoryPort) => new GetImportStatusUseCase(repo),
      inject: [ImportJobRepositoryPort],
    },
    {
      provide: ListImportHistoryUseCase,
      useFactory: (repo: ImportJobRepositoryPort) => new ListImportHistoryUseCase(repo),
      inject: [ImportJobRepositoryPort],
    },
    {
      provide: CancelImportUseCase,
      useFactory: (repo: ImportJobRepositoryPort) => new CancelImportUseCase(repo),
      inject: [ImportJobRepositoryPort],
    },
    {
      provide: RetryImportUseCase,
      useFactory: (repo: ImportJobRepositoryPort, creator: ResumeCreatorPort) =>
        new RetryImportUseCase(repo, creator),
      inject: [ImportJobRepositoryPort, ResumeCreatorPort],
    },
  ],
  exports: [
    CreateImportJobUseCase,
    ProcessImportUseCase,
    GetImportStatusUseCase,
    ListImportHistoryUseCase,
    CancelImportUseCase,
    RetryImportUseCase,
  ],
})
export class ImportModule {}
