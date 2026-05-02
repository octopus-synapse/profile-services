/**
 * Typst WASM PDF Renderer (Stub)
 *
 * Placeholder for the future Typst-via-WASM rendering pipeline. The class is
 * shipped now so the rest of the app (factory wiring, tests) can reference
 * the symbol; the `generate()` call deliberately throws
 * `TypstWasmRendererNotImplementedException` until the WASM bindings land.
 *
 * Until then callers should stay on `TypstCompilerService` (binary-backed),
 * which is wired by default. Swap to this renderer behind a feature flag
 * once `wasm/` artefacts are available.
 */

import { TypstWasmRendererNotImplementedException } from '../../../domain/exceptions/export.exceptions';
import type { PdfGeneratorOptions } from '../../../domain/ports/pdf-generator.port';
import { PdfGeneratorPort } from '../../../domain/ports/pdf-generator.port';

export class TypstWasmPdfRenderer extends PdfGeneratorPort {
  generate(_options?: PdfGeneratorOptions): Promise<Buffer> {
    throw new TypstWasmRendererNotImplementedException();
  }
}
