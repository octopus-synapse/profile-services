export interface PdfRenderOptions {
  /** Override template path (for testing) */ templatePath?: string;
  /** Timeout in ms */
  timeout?: number;
}

export abstract class PdfRendererPort {
  abstract render(astJson: string, options?: PdfRenderOptions): Promise<Buffer>;
}
