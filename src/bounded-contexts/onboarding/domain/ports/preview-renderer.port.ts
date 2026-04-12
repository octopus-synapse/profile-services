/**
 * Preview Renderer Port
 *
 * Abstraction for rendering onboarding resume preview as PNG.
 */

export abstract class PreviewRendererPort {
  abstract renderPreview(userId: string): Promise<Buffer | null>;
}
