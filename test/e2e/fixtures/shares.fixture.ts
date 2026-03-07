/**
 * Share Fixtures for E2E Testing
 *
 * Provides share creation data for Journey 4: Public Resume tests.
 * Includes basic shares, password-protected shares, and expiring shares.
 */

/**
 * Creates basic share data with custom slug.
 *
 * @param resumeId - Resume ID to share
 * @param suffix - Optional suffix for unique slug (defaults to timestamp)
 * @returns Share creation payload
 */
export function createShareData(resumeId: string, suffix?: string) {
  return {
    resumeId,
    slug: `resume-${suffix || Date.now()}`,
  };
}

/**
 * Creates password-protected share data.
 *
 * @param resumeId - Resume ID to share
 * @param password - Password to protect the share (min 8 chars)
 * @returns Password-protected share creation payload
 */
export function createPasswordProtectedShare(resumeId: string, password: string) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  return {
    resumeId,
    slug: `protected-${Date.now()}`,
    password,
  };
}

/**
 * Creates share data with expiration date.
 *
 * @param resumeId - Resume ID to share
 * @param expiresInMinutes - Minutes until expiration (can be negative for past dates)
 * @returns Expiring share creation payload
 */
export function createExpiringShare(resumeId: string, expiresInMinutes: number) {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  return {
    resumeId,
    slug: `expiring-${Date.now()}`,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Creates share with both password protection and expiration.
 *
 * @param resumeId - Resume ID to share
 * @param password - Password to protect the share
 * @param expiresInMinutes - Minutes until expiration
 * @returns Password-protected expiring share creation payload
 */
export function createSecureExpiringShare(
  resumeId: string,
  password: string,
  expiresInMinutes: number,
) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  return {
    resumeId,
    slug: `secure-${Date.now()}`,
    password,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Creates share with custom slug (user-friendly URL).
 *
 * @param resumeId - Resume ID to share
 * @param customSlug - Custom slug (alphanumeric + hyphens only, 3-50 chars)
 * @returns Share creation payload with custom slug
 */
export function createShareWithCustomSlug(resumeId: string, customSlug: string) {
  // Validate slug format (lowercase alphanumeric + hyphens)
  const slugRegex = /^[a-z0-9-]{3,50}$/;
  if (!slugRegex.test(customSlug)) {
    throw new Error('Slug must be lowercase alphanumeric with hyphens (3-50 chars)');
  }

  return {
    resumeId,
    slug: customSlug,
  };
}
