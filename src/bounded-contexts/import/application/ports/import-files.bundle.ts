/**
 * Aggregated bundle for the import BC's file-driven endpoints
 * (multipart PDF upload + GitHub session-import). The synthesizer
 * injects a single DI token per route group; this bundle wraps the
 * stateful Nest adapters so the route handlers stay pure.
 *
 * The wiring lives in `import.module.ts` (`useFactory`).
 */

import type { GithubImportService } from '../../infrastructure/adapters/github-import.service';
import type { PdfImportService } from '../../infrastructure/adapters/pdf-import.service';

export abstract class ImportFilesBundle {
  abstract readonly pdfImport: PdfImportService;
  abstract readonly githubImport: GithubImportService;
}
