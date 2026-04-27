/**
 * Aggregated HTTP-facing bundle for the public-resumes BC.
 *
 * The route synthesizer (`synthesizeRouteControllers`) injects a single
 * DI token per BC. The public-resumes HTTP surface needs the
 * `ResumeShareService`, the `AccessPublicResumeUseCase`, and the public
 * app URL (read from `ConfigService`) to build outgoing share URLs.
 * We aggregate them here so the route handlers stay pure functions of
 * `(ctx, bundle)`.
 *
 * The wiring lives in `public-resumes.module.ts` (`useFactory`).
 */

import type { AccessPublicResumeUseCase } from '../use-cases/access-public-resume.use-case';
import type { ResumeShareService } from '../../services/resume-share.service';

export abstract class PublicResumesHttpBundle {
  abstract readonly shareService: ResumeShareService;
  abstract readonly accessResume: AccessPublicResumeUseCase;
  abstract readonly publicAppUrl: string;
}
