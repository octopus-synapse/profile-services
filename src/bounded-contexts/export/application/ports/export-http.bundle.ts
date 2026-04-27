/**
 * Aggregated HTTP-facing bundle for the export BC.
 *
 * The route synthesizer (`synthesizeRouteControllers`) injects a single
 * DI token per BC. The export HTTP surface needs the use-case bag plus
 * the pipeline service (for the Requested/Completed/Failed event
 * lifecycle), the Banner capture service, and the PDF cache. We
 * aggregate them here so the route handlers stay pure functions of
 * `(ctx, bundle)`.
 *
 * The wiring lives in `export.module.ts` (`useFactory`).
 */

import type { BannerCaptureService } from '../../infrastructure/adapters/external-services/banner-capture.service';
import type { PdfCacheService } from '../../infrastructure/services/pdf-cache.service';
import type { ExportPipelineService } from '../services/export-pipeline.service';
import type { ExportUseCases } from './export.port';

export abstract class ExportHttpBundle {
  abstract readonly useCases: ExportUseCases;
  abstract readonly pipeline: ExportPipelineService;
  abstract readonly bannerCapture: BannerCaptureService;
  abstract readonly pdfCache: PdfCacheService;
}
