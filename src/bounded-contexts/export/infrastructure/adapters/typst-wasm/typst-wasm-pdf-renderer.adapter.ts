import { Injectable } from '@nestjs/common';
import {
  PdfRendererPort,
  type PdfRenderOptions,
} from '@/bounded-contexts/export/domain/ports/pdf-renderer.port';

@Injectable()
export class TypstWasmPdfRendererAdapter extends PdfRendererPort {
  async render(astJson: string, options?: PdfRenderOptions): Promise<Buffer> {
    // TODO: Replace with actual Typst WASM binding
    // Expected integration: @aspect-build/typst-ts-wasm or similar
    //
    // Implementation steps:
    // 1. Write astJson to a virtual filesystem as "data.json"
    // 2. Load the Typst template from templates-v2/resume.typ
    // 3. Compile via WASM: typst.compile(mainFile, virtualFs) -> Uint8Array
    // 4. Return Buffer.from(result)
    void astJson;
    void options;

    throw new Error(
      'TypstWasmPdfRenderer is not yet implemented. ' +
        'Awaiting Typst WASM binding integration. ' +
        'Use the existing TypstCompilerService as fallback.',
    );
  }
}
