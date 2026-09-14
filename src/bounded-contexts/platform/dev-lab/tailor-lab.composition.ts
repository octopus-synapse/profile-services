/**
 * Dev-lab BC composition root.
 *
 * Only ever called behind the `NODE_ENV === 'development'` guard in
 * `elysia-bootstrap.ts`. Every dependency is an instance the bootstrap already
 * built — the lab adds no adapters of its own, so it exercises the same
 * repository, the same LLM client and the same job importer as production.
 */

import type { TailorLabLlmPort } from '@/bounded-contexts/ai/domain/ports/tailor-lab-llm.port';
import type { ResumeVersionsRepositoryPort } from '@/bounded-contexts/resumes/resume-versions/domain/ports/resume-versions.repository.port';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import { RunTailorLabUseCase } from './application/run-tailor-lab.use-case';
import { SaveTailorLabRunUseCase } from './application/save-tailor-lab-run.use-case';
import type { JobUrlPreviewPort } from './domain/ports/job-url-preview.port';
import { readTailorLabHtml, type TailorLabBundle } from './tailor-lab.bundle';
import { tailorLabDevRoutes } from './tailor-lab.dev-routes';

export type { TailorLabBundle };

/** Mirrors the adapter's production fallbacks so the page shows real values. */
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_MAX_TOKENS = 1500;
const DEFAULT_TEMPERATURE = 0.2;

export interface TailorLabDeps {
  readonly repository: ResumeVersionsRepositoryPort;
  readonly llm: TailorLabLlmPort;
  readonly jobUrlPreview: JobUrlPreviewPort;
  readonly config: ConfigPort;
}

export function buildTailorLabComposition(
  deps: TailorLabDeps,
): BoundedContextComposition<TailorLabBundle> {
  const bundle: TailorLabBundle = {
    readHtml: readTailorLabHtml,
    defaults: {
      systemPrompt: deps.llm.defaultSystemPrompt,
      model: deps.config.get<string>('OPENAI_MODEL') ?? DEFAULT_MODEL,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: Number(deps.config.get<string>('OPENAI_MAX_TOKENS') ?? String(DEFAULT_MAX_TOKENS)),
    },
    runTailorLab: new RunTailorLabUseCase(deps.repository, deps.llm),
    saveTailorLabRun: new SaveTailorLabRunUseCase(deps.repository),
    jobUrlPreview: deps.jobUrlPreview,
  };

  return { useCases: bundle, routes: tailorLabDevRoutes };
}
