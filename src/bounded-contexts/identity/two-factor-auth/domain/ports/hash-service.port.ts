/**
 * Hash Service Port (Outbound)
 *
 * Defines the contract for hashing operations (backup codes).
 * Implementation uses bcrypt.
 */

export abstract class HashServicePort {
  /**
   * Hash a value
   */
  abstract hash(value: string): Promise<string>;

  /**
   * Compare a value against a hash
   */
  abstract compare(value: string, hash: string): Promise<boolean>;
}
