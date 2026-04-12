import { describe, expect, it } from 'bun:test';
import { PdfRendererPort } from '@/bounded-contexts/export/domain/ports/pdf-renderer.port';
import { TypstWasmPdfRendererAdapter } from './typst-wasm-pdf-renderer.adapter';

describe('TypstWasmPdfRendererAdapter', () => {
  it('should be instantiable', () => {
    const adapter = new TypstWasmPdfRendererAdapter();
    expect(adapter).toBeInstanceOf(TypstWasmPdfRendererAdapter);
  });

  it('should extend PdfRendererPort', () => {
    const adapter = new TypstWasmPdfRendererAdapter();
    expect(adapter).toBeInstanceOf(PdfRendererPort);
  });

  it('should throw a not-implemented error when render is called', async () => {
    const adapter = new TypstWasmPdfRendererAdapter();
    await expect(adapter.render('{"sections":[]}')).rejects.toThrow(
      'TypstWasmPdfRenderer is not yet implemented.',
    );
  });

  it('should mention the fallback in the error message', async () => {
    const adapter = new TypstWasmPdfRendererAdapter();
    await expect(adapter.render('{}', { timeout: 5000 })).rejects.toThrow(
      'Use the existing TypstCompilerService as fallback.',
    );
  });

  it('should not allow direct instantiation of PdfRendererPort', () => {
    // PdfRendererPort is abstract — instantiating it directly is a compile-time
    // error. At runtime we verify that its prototype lacks a concrete render.
    expect(PdfRendererPort.prototype.render).toBeUndefined();
  });
});
