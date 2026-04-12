/**
 * Theme Preview Port
 *
 * Abstraction for theme preview generation.
 * Implemented by infrastructure adapter that delegates to export/dsl services.
 */

export abstract class ThemePreviewPort {
  abstract generateAndUploadPreview(themeId: string): Promise<string | null>;
}
