/**
 * User ID Value Object
 *
 * Encapsulates user identifier with validation.
 * Immutable and equality-based.
 */
export class UserId {
  private readonly value: string;

  private constructor(id: string) {
    this.value = id;
  }

  /**
   * Creates a UserId from a string
   * @throws Error if id is empty or invalid
   */
  static create(id: string): UserId {
    if (!id || id.trim().length === 0) {
      throw new Error('UserId cannot be empty');
    }
    return new UserId(id.trim());
  }

  /**
   * Creates a UserId without validation (for internal use)
   */
  static fromString(id: string): UserId {
    return new UserId(id);
  }

  /**
   * Returns the primitive value
   */
  toString(): string {
    return this.value;
  }

  /**
   * Returns the primitive value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Checks equality with another UserId
   */
  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}
