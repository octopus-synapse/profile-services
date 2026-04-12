/**
 * Resume Repository Port (Themes context)
 *
 * Abstraction for resume operations needed by theme use cases.
 */

import type { JsonValue } from './theme.repository.port';

export type ResumeWithTheme = {
  id: string;
  userId: string;
  activeThemeId: string | null;
  customTheme: unknown;
  activeTheme: {
    id: string;
    styleConfig: unknown;
  } | null;
};

export abstract class ResumeRepositoryPort {
  abstract findById(id: string): Promise<{ id: string; userId: string } | null>;

  abstract findByIdWithTheme(id: string): Promise<ResumeWithTheme | null>;

  abstract applyTheme(resumeId: string, themeId: string, customizations: JsonValue): Promise<void>;
}
