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

export abstract class TotpServicePort {
  /**
   * Generate a new TOTP secret
   */
  abstract generateSecret(label: string, issuer: string): TotpSecret;

  /**
   * Verify a TOTP token against a secret
   */
  abstract verifyToken(secret: string, token: string, window?: number): boolean;
}
