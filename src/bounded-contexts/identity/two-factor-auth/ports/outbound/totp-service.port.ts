/**
 * TOTP Service Port (Outbound)
 *
 * Defines the contract for TOTP operations.
 * Implementation uses speakeasy library.
 */

export interface TotpSecret {
  base32: string;
  otpauthUrl: string;
}

export interface TotpServicePort {
  /**
   * Generate a new TOTP secret
   */
  generateSecret(label: string, issuer: string): TotpSecret;

  /**
   * Verify a TOTP token against a secret
   */
  verifyToken(secret: string, token: string, window?: number): boolean;
}

export const TOTP_SERVICE_PORT = Symbol('TotpServicePort');
