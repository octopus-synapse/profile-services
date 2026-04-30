/**
 * Aggregated HTTP-facing bundle for the public-resumes BC.
 *
 * The route synthesizer (`synthesizeRouteControllers`) injects a single
 * DI token per BC. The public-resumes HTTP surface needs the
 * `ResumeShareService`, the `AccessPublicResumeUseCase`, and the public
 * app URL (read from `ConfigService`) to build outgoing share URLs. The
 * binary PNG endpoints (OpenGraph preview, share QR) additionally need
 * `OgImageService` and `QrCodeService` to render their buffers.
 * We aggregate them here so the route handlers stay pure functions of
 * `(ctx, bundle)`.
 *
 * The wiring lives in `public-resumes.module.ts` (`useFactory`).
 */

import type { OgImageService } from '../../services/og-image.service';
import type { QrCodeService } from '../../services/qr-code.service';
import type { ResumeShareService } from '../../services/resume-share.service';
import type { AccessPublicResumeUseCase } from '../use-cases/access-public-resume.use-case';

export abstract class PublicResumesHttpBundle {
  abstract readonly shareService: ResumeShareService;
  abstract readonly accessResume: AccessPublicResumeUseCase;
  abstract readonly ogImageService: OgImageService;
  abstract readonly qrCodeService: QrCodeService;
  abstract readonly publicAppUrl: string;
}
