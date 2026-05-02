import { describe, expect, it } from 'bun:test';
import { TypstWasmRendererNotImplementedException } from '../../../domain/exceptions/export.exceptions';
import { TypstWasmPdfRenderer } from './typst-wasm-pdf-renderer.service';

describe('TypstWasmPdfRenderer', () => {
  it('throws TypstWasmRendererNotImplementedException until WASM bindings land', () => {
    const renderer = new TypstWasmPdfRenderer();
    expect(() => renderer.generate()).toThrow(TypstWasmRendererNotImplementedException);
  });
});
