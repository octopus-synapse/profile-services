/**
 * Import Module
 *
 * Thin Nest shell over `buildImportUseCases`. All wiring lives in
 * `import.composition.ts`. The stateful import services
 * (`PdfImportService`, `GithubImportService`) and the GitHub HTTP
 * adapter stay as Nest providers — composition takes the API port as
 * a parameter, services are injected directly into the controller.
 */

import { Module } from '@nestjs/common';
import { AiModule } from '@/bounded-contexts/ai/ai.module';
import { OAuthModule } from '@/bounded-contexts/identity/oauth/oauth.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { ImportUseCases } from './application/ports/import.port';
import { GithubApiPort } from './application/use-cases/import-github/github-api.port';
import { buildImportUseCases } from './import.composition';
import { GithubApiAdapter } from './infrastructure/adapters/github-api.adapter';
import { GithubImportService } from './infrastructure/adapters/github-import.service';
import { PdfImportService } from './infrastructure/adapters/pdf-import.service';
import { GithubImportController } from './infrastructure/controllers/github-import.controller';
import { ResumeImportController } from './infrastructure/controllers/resume-import.controller';

@Module({
  imports: [PrismaModule, LoggerModule, AiModule, OAuthModule],
  controllers: [ResumeImportController, GithubImportController],
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
  ],
  exports: [ImportUseCases],
})
export class ImportModule {}
