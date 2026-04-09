/**
 * DOCX Renderer Port
 *
 * Defines the abstraction for rendering a Resume AST JSON into a DOCX buffer.
 * Adapters implement this port to provide concrete rendering strategies.
 */

export interface DocxRenderOptions {
  timeout?: number;
}

export abstract class DocxRendererPort {
  abstract render(astJson: string, options?: DocxRenderOptions): Promise<Buffer>;
}

export const DOCX_RENDERER = Symbol('DOCX_RENDERER');
