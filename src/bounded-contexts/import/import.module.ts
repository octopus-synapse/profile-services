/**
 * Import Module
 *
 * Thin Nest shell over `buildImportUseCases`. All wiring lives in
 * `import.composition.ts`. JSON-only endpoints come from
 * `import.routes.ts`; the multipart PDF upload + GitHub OAuth-backed
 * import live in the same file under `importFilesRoutes`, which the
 * synthesizer wires up against an `ImportFilesBundle` aggregating the
 * stateful adapters.
 */

import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { OAuthModule } from '@/bounded-contexts/identity/oauth/oauth.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { ImportUseCases } from './application/ports/import.port';
import { ImportFilesBundle } from './application/ports/import-files.bundle';
import { GithubApiPort } from './application/use-cases/import-github/github-api.port';
import { buildImportUseCases } from './import.composition';
import { importFilesRoutes, importRoutes } from './import.routes';
import { GithubApiAdapter } from './infrastructure/adapters/github-api.adapter';
import { GithubImportService } from './infrastructure/adapters/github-import.service';
import { PdfImportService } from './infrastructure/adapters/pdf-import.service';

@Module({
  imports: [PrismaModule, LoggerModule, AiModule, OAuthModule],
  controllers: [
    ...synthesizeRouteControllers(ImportUseCases, importRoutes),
    ...synthesizeRouteControllers(ImportFilesBundle, importFilesRoutes),
  ],
  providers: [
    { provide: GithubApiPort, useClass: GithubApiAdapter },
    PdfImportService,
    GithubImportService,
    {
      provide: ImportUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort, githubApi: GithubApiPort) =>
        buildImportUseCases(prisma, logger, githubApi),
      inject: [PrismaService, LoggerPort, GithubApiPort],
    },
    {
      provide: ImportFilesBundle,
      useFactory: (
        pdfImport: PdfImportService,
        githubImport: GithubImportService,
      ): ImportFilesBundle => ({ pdfImport, githubImport }),
      inject: [PdfImportService, GithubImportService],
    },
  ],
  exports: [ImportUseCases],
})
export class ImportModule {}
