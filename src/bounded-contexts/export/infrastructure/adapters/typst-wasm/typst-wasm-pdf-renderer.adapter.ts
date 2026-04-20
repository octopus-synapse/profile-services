import { Injectable } from '@nestjs/common';
import {
  PdfRendererPort,
  type PdfRenderOptions,
} from '@/bounded-contexts/export/domain/ports/pdf-renderer.port';

@Injectable()
export class TypstWasmPdfRendererAdapter extends PdfRendererPort {
  async render(astJson: string, options?: PdfRenderOptions): Promise<Buffer> {
    // Stub adapter: kept in place so the DI container can wire a Typst WASM
    // path once a real binding lands (e.g. @aspect-build/typst-ts-wasm).
    // Until then, callers must use TypstCompilerService instead.
    void astJson;
    void options;

    throw new Error(
      'TypstWasmPdfRenderer is not yet implemented. ' +
        'Awaiting Typst WASM binding integration. ' +
        'Use the existing TypstCompilerService as fallback.',
    );
  }
}
