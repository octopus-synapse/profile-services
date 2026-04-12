/**
 * Shares Port
 *
 * Defines the use cases interface and injection token for the Public Resumes submodule.
 */

import type { ShareEntity, ShareWithResume } from '../../domain/ports/share.repository.port';

// ============================================================================
// Injection Token
// ============================================================================

export const SHARE_USE_CASES = Symbol('SHARE_USE_CASES');

// ============================================================================
// Use Cases Interface
// ============================================================================

export interface ShareUseCases {
  createShareUseCase: {
    execute: (
      userId: string,
      dto: {
        resumeId: string;
        slug?: string;
        password?: string;
        expiresAt?: Date;
      },
    ) => Promise<ShareEntity>;
  };
  getShareBySlugUseCase: {
    execute: (slug: string) => Promise<ShareWithResume | null>;
    getResumeWithCache: (resumeId: string) => Promise<unknown>;
    verifyPassword: (plaintext: string, hash: string) => Promise<boolean>;
  };
  deleteShareUseCase: {
    execute: (userId: string, shareId: string) => Promise<ShareEntity>;
  };
  listUserSharesUseCase: {
    execute: (userId: string, resumeId: string) => Promise<ShareEntity[]>;
  };
}
