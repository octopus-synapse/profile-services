/**
 * Style Preview Port — abstraction over the export pipeline so the
 * resume-styles use case stays free of `export/` internals. The
 * adapter binds to whichever PDF backend is configured (Typst today).
 */
export interface StylePreviewInput {
  /** Authenticated user whose primary resume is rendered with the
   *  candidate style applied — the preview shows real content, since the
   *  Typst pipeline requires a resume to render (no blank-fixture mode). */
  readonly userId: string;
  readonly typstTemplate: string;
  readonly styleConfig: Readonly<Record<string, unknown>>;
}

export abstract class StylePreviewPort {
  abstract render(input: StylePreviewInput): Promise<Buffer>;
}
