/**
 * Hash Service Port (Outbound)
 *
 * Defines the contract for hashing operations (backup codes).
 * Implementation uses bcrypt.
 */

export interface HashServicePort {
  /**
   * Hash a value
   */
  hash(value: string): Promise<string>;

  /**
   * Compare a value against a hash
   */
  compare(value: string, hash: string): Promise<boolean>;
}

export const HASH_SERVICE_PORT = Symbol('HashServicePort');
