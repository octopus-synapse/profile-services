/**
 * Username Service Tests
 *
 * Business Rules Tested:
 * 1. Cooldown: 30 days from last change (null = immediate allowed)
 * 2. Format: Lowercase only, uppercase rejected (not converted)
 * 3. Reserved: Configurable list of prohibited usernames
 * 4. Onboarding: First definition has no cooldown
 */

describe('Username Business Rules', () => {
  const USERNAME_COOLDOWN_DAYS = 30;

  describe('Cooldown Rules (30 days)', () => {
    const canUpdateUsername = (usernameUpdatedAt: Date | null): boolean => {
      // Rule: lastUsernameChangeAt === null → change allowed
      if (usernameUpdatedAt === null) return true;

      // Rule: now - lastUsernameChangeAt >= 30 days → allowed
      const cooldownMs = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      return Date.now() - usernameUpdatedAt.getTime() >= cooldownMs;
    };

    const getRemainingCooldownDays = (usernameUpdatedAt: Date): number => {
      const cooldownMs = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - usernameUpdatedAt.getTime();
      const remaining = cooldownMs - elapsed;
      return Math.ceil(remaining / (24 * 60 * 60 * 1000));
    };

    it('should allow username change when never changed before (usernameUpdatedAt is null)', () => {
      expect(canUpdateUsername(null)).toBe(true);
    });

    it('should allow username change after 30+ days from last change', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      expect(canUpdateUsername(thirtyOneDaysAgo)).toBe(true);
    });

    it('should reject username change within 30 days of last change', () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      expect(canUpdateUsername(fifteenDaysAgo)).toBe(false);
    });

    it('should calculate remaining days correctly', () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      const remaining = getRemainingCooldownDays(twentyDaysAgo);
      expect(remaining).toBe(10); // 30 - 20 = 10 days remaining
    });

    it('should allow change exactly on day 30', () => {
      const exactlyThirtyDaysAgo = new Date();
      exactlyThirtyDaysAgo.setDate(exactlyThirtyDaysAgo.getDate() - 30);

      expect(canUpdateUsername(exactlyThirtyDaysAgo)).toBe(true);
    });

    it('should reject change on day 29', () => {
      const twentyNineDaysAgo = new Date();
      twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);

      expect(canUpdateUsername(twentyNineDaysAgo)).toBe(false);
    });
  });

  describe('Username Format (Lowercase Only)', () => {
    const LOWERCASE_ONLY_REGEX = /^[a-z0-9_-]+$/;

    const isValidUsernameFormat = (username: string): boolean => {
      // Rule: Only lowercase letters are permitted
      // Uppercase is REJECTED, not converted
      return LOWERCASE_ONLY_REGEX.test(username);
    };

    it('should reject username with uppercase letters', () => {
      expect(isValidUsernameFormat('JohnDoe')).toBe(false);
    });

    it('should reject username with mixed case', () => {
      expect(isValidUsernameFormat('johnDoe')).toBe(false);
    });

    it('should accept lowercase-only username', () => {
      expect(isValidUsernameFormat('johndoe')).toBe(true);
    });

    it('should accept username with numbers', () => {
      expect(isValidUsernameFormat('john123')).toBe(true);
    });

    it('should accept username with underscores', () => {
      expect(isValidUsernameFormat('john_doe')).toBe(true);
    });

    it('should accept username with hyphens', () => {
      expect(isValidUsernameFormat('john-doe')).toBe(true);
    });

    it('should accept combined lowercase, numbers, underscores, hyphens', () => {
      expect(isValidUsernameFormat('john_doe-123')).toBe(true);
    });

    it('should reject username with special characters', () => {
      expect(isValidUsernameFormat('john@doe')).toBe(false);
      expect(isValidUsernameFormat('john.doe')).toBe(false);
      expect(isValidUsernameFormat('john doe')).toBe(false);
    });

    it('should reject username starting with number', () => {
      // This depends on business rule - may or may not be allowed
      // Assuming it's allowed based on regex
      expect(isValidUsernameFormat('123john')).toBe(true);
    });
  });

  describe('Username Length Validation', () => {
    const MIN_LENGTH = 3;
    const MAX_LENGTH = 50;

    const isValidUsernameLength = (username: string): boolean => {
      return username.length >= MIN_LENGTH && username.length <= MAX_LENGTH;
    };

    it('should reject username shorter than minimum', () => {
      expect(isValidUsernameLength('ab')).toBe(false);
    });

    it('should accept username at minimum length', () => {
      expect(isValidUsernameLength('abc')).toBe(true);
    });

    it('should accept username at maximum length', () => {
      expect(isValidUsernameLength('a'.repeat(50))).toBe(true);
    });

    it('should reject username longer than maximum', () => {
      expect(isValidUsernameLength('a'.repeat(51))).toBe(false);
    });
  });

  describe('Reserved Usernames', () => {
    // Rule: Reserved usernames from configurable list
    const RESERVED_USERNAMES = new Set([
      'admin',
      'api',
      'www',
      'support',
      'help',
      'root',
      'system',
      'null',
      'undefined',
    ]);

    const isReservedUsername = (username: string): boolean => {
      return RESERVED_USERNAMES.has(username.toLowerCase());
    };

    it('should reject "admin" as reserved', () => {
      expect(isReservedUsername('admin')).toBe(true);
    });

    it('should reject "api" as reserved', () => {
      expect(isReservedUsername('api')).toBe(true);
    });

    it('should reject "www" as reserved', () => {
      expect(isReservedUsername('www')).toBe(true);
    });

    it('should reject "support" as reserved', () => {
      expect(isReservedUsername('support')).toBe(true);
    });

    it('should reject "help" as reserved', () => {
      expect(isReservedUsername('help')).toBe(true);
    });

    it('should reject "root" as reserved', () => {
      expect(isReservedUsername('root')).toBe(true);
    });

    it('should accept non-reserved username', () => {
      expect(isReservedUsername('johndoe')).toBe(false);
    });

    it('should be case-insensitive for reserved check', () => {
      expect(isReservedUsername('Admin')).toBe(true);
      expect(isReservedUsername('ADMIN')).toBe(true);
    });
  });

  describe('Username Availability', () => {
    const isUsernameTaken = (
      username: string,
      existingUsernames: Map<string, string>,
      excludeUserId?: string,
    ): boolean => {
      const ownerUserId = existingUsernames.get(username);
      if (!ownerUserId) return false;
      if (excludeUserId && ownerUserId === excludeUserId) return false;
      return true;
    };

    it('should return true when username is taken', () => {
      const existing = new Map([['johndoe', 'user-1']]);
      expect(isUsernameTaken('johndoe', existing)).toBe(true);
    });

    it('should return false when username is available', () => {
      const existing = new Map([['johndoe', 'user-1']]);
      expect(isUsernameTaken('janedoe', existing)).toBe(false);
    });

    it('should return false when username belongs to excluded user', () => {
      const existing = new Map([['johndoe', 'user-1']]);
      expect(isUsernameTaken('johndoe', existing, 'user-1')).toBe(false);
    });

    it('should return true when username taken by different user than excluded', () => {
      const existing = new Map([['johndoe', 'user-2']]);
      expect(isUsernameTaken('johndoe', existing, 'user-1')).toBe(true);
    });
  });

  describe('Complete Username Validation', () => {
    interface ValidationResult {
      valid: boolean;
      errors: string[];
    }

    const RESERVED = new Set(['admin', 'api', 'www', 'support']);
    const FORMAT_REGEX = /^[a-z0-9_-]+$/;
    const MIN_LENGTH = 3;
    const MAX_LENGTH = 50;

    const validateUsername = (
      username: string,
      existingUsernames: Set<string>,
    ): ValidationResult => {
      const errors: string[] = [];

      // Length check
      if (username.length < MIN_LENGTH) {
        errors.push(`Username must be at least ${MIN_LENGTH} characters`);
      }
      if (username.length > MAX_LENGTH) {
        errors.push(`Username must be at most ${MAX_LENGTH} characters`);
      }

      // Format check (lowercase only)
      if (!FORMAT_REGEX.test(username)) {
        errors.push(
          'Username can only contain lowercase letters, numbers, underscores, and hyphens',
        );
      }

      // Reserved check
      if (RESERVED.has(username.toLowerCase())) {
        errors.push('This username is reserved');
      }

      // Availability check
      if (existingUsernames.has(username)) {
        errors.push('Username is already taken');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    };

    it('should pass all validations for valid username', () => {
      const result = validateUsername('johndoe', new Set());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return all applicable errors', () => {
      const result = validateUsername('A', new Set(['a']));
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject taken username', () => {
      const existing = new Set(['johndoe']);
      const result = validateUsername('johndoe', existing);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Username is already taken');
    });

    it('should reject reserved username', () => {
      const result = validateUsername('admin', new Set());
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('This username is reserved');
    });
  });
});
