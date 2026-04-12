/**
 * DocxJs Renderer Adapter
 *
 * Implements DocxRendererPort using the `docx` npm package.
 * Delegates AST parsing and document building to the pure mapper functions.
 */

import { Injectable } from '@nestjs/common';

import { DocxRendererPort, type DocxRenderOptions } from '../../../domain/ports/docx-renderer.port';
import { mapAstToDocxDocument, renderDocxBuffer } from './ast-to-docx.mapper';

@Injectable()
export class DocxJsRendererAdapter extends DocxRendererPort {
  async render(astJson: string, _options?: DocxRenderOptions): Promise<Buffer> {
    const doc = mapAstToDocxDocument(astJson);
    return renderDocxBuffer(doc);
  }
}
