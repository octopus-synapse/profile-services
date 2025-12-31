/**
 * Crypto Constants
 *
 * Constants for cryptographic operations and byte conversions.
 */
export const CRYPTO_CONSTANTS = {
  /** Secure random token size (256 bits) */
  TOKEN_BYTES: 32,
  /** Bytes per kilobyte */
  BYTES_PER_KB: 1024,
  /** Bytes per megabyte */
  BYTES_PER_MB: 1024 * 1024,
} as const;
