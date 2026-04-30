/**
 * Shares Port
 *
 * Defines the use cases interface and injection token for the Public Resumes submodule.
 */

import type { ShareEntity, ShareWithResume } from '../../domain/ports/share.repository.port';

// ============================================================================
// Injection Token
// ============================================================================

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class ShareUseCases {
  abstract readonly createShareUseCase: {
    execute: (
      userId: string,
      dto: { resumeId: string; slug?: string; password?: string; expiresAt?: Date },
    ) => Promise<ShareEntity>;
  };
  abstract readonly getShareBySlugUseCase: {
    execute: (slug: string) => Promise<ShareWithResume | null>;
    getResumeWithCache: (resumeId: string) => Promise<unknown>;
    verifyPassword: (plaintext: string, hash: string) => Promise<boolean>;
  };
  abstract readonly deleteShareUseCase: {
    execute: (userId: string, shareId: string) => Promise<ShareEntity>;
  };
  abstract readonly listUserSharesUseCase: {
    execute: (userId: string, resumeId: string) => Promise<ShareEntity[]>;
  };
}
