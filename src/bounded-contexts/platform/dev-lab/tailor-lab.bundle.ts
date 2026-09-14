/**
 * Dev-lab BC bundle — the page bytes plus the use cases its routes call.
 *
 * Unlike the docs BC (which renders its HTML once at boot), the page is read
 * from disk **per request**. `bun --watch` only observes `.ts`, so a boot-time
 * read would mean restarting the container after every HTML tweak — the exact
 * loop this tool exists to shorten. A ~30 KB read on a development-only route
 * costs nothing.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RunTailorLabUseCase } from './application/run-tailor-lab.use-case';
import type { SaveTailorLabRunUseCase } from './application/save-tailor-lab-run.use-case';
import type { JobUrlPreviewPort } from './domain/ports/job-url-preview.port';

/**
 * The page's own Content-Security-Policy. The global default is
 * `script-src 'self'`, which would kill the inline `<script>` carrying all the
 * page logic; `applySecurityHeaders` never clobbers a header the handler set.
 * `frame-src 'self'` covers the `<iframe srcdoc>` that renders the resume
 * preview, whose HTML is self-contained with inline styles.
 */
export const TAILOR_LAB_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

/** Defaults the page pre-loads into its editable fields. */
export interface TailorLabDefaults {
  readonly systemPrompt: string;
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
}

export interface TailorLabBundle {
  /** Reads `tailor-lab.html` fresh on every call — see the module header. */
  readHtml(): Uint8Array;
  readonly defaults: TailorLabDefaults;
  readonly runTailorLab: RunTailorLabUseCase;
  readonly saveTailorLabRun: SaveTailorLabRunUseCase;
  readonly jobUrlPreview: JobUrlPreviewPort;
}

/**
 * `import.meta.dir` rather than `process.cwd()`: the dev container runs with
 * cwd `/app` and bind-mounts `./src`, so the file resolves next to this module.
 * The production bundle never reaches here — the BC only mounts in development.
 */
export function readTailorLabHtml(): Uint8Array {
  return new Uint8Array(readFileSync(join(import.meta.dir, 'tailor-lab.html')));
}
