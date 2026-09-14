/**
 * Structural port for "fetch a job URL and extract its fields".
 *
 * Declared locally rather than importing the jobs BC's use case so the dev-lab
 * stays inside the BC-isolation rules; the bootstrap injects the real
 * `ImportJobFromUrlUseCase` instance, which matches this shape. Reusing that
 * implementation means the lab inherits the same SSRF-defended fetch, the same
 * HTML strip and the same extraction prompt as production — while skipping the
 * route-level `JOB_CREATE` permission and the 5-per-10-minutes rate limit that
 * would throttle a laboratory.
 *
 * Expect this to fail on LinkedIn (blocks the bot User-Agent) and Gupy (a React
 * SPA whose served HTML strips to nothing). The lab falls back to pasted text.
 */

import type { ExtractedJob } from '@/bounded-contexts/ai/domain/ports/llm.port';

export interface JobUrlPreviewPort {
  execute(url: string): Promise<{ readonly source: string; readonly preview: ExtractedJob }>;
}
