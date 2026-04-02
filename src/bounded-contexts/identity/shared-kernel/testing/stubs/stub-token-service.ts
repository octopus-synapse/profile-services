/**
 * Stub Token Service
 *
 * Test double for password reset token operations.
 */

import type { PasswordResetTokenPort } from '../../../password-management/domain/ports';

export class StubTokenService implements PasswordResetTokenPort {
  private tokens: Map<string, { userId: string; createdAt: Date }> = new Map();
  private shouldValidate = true;
  private validationResult: string | null = null;

  async createToken(userId: string, token: string): Promise<void> {
    this.tokens.set(token, { userId, createdAt: new Date() });
  }

  async validateToken(token: string): Promise<string> {
    if (!this.shouldValidate) {
      throw new Error('Invalid or expired token');
    }
    if (this.validationResult) {
      return this.validationResult;
    }
    const data = this.tokens.get(token);
    if (!data) {
      throw new Error('Invalid or expired token');
    }
    return data.userId;
  }

  async validateAndConsumeToken(token: string): Promise<string> {
    const userId = await this.validateToken(token);
    await this.invalidateToken(token);
    return userId;
  }

  async invalidateToken(token: string): Promise<void> {
    this.tokens.delete(token);
  }

  // Test helpers
  setShouldValidate(value: boolean): void {
    this.shouldValidate = value;
  }

  setValidationResult(userId: string | null): void {
    this.validationResult = userId;
  }

  getToken(token: string): { userId: string; createdAt: Date } | undefined {
    return this.tokens.get(token);
  }

  getAllTokens(): Map<string, { userId: string; createdAt: Date }> {
    return new Map(this.tokens);
  }

  hasToken(token: string): boolean {
    return this.tokens.has(token);
  }

  getTokensForUser(userId: string): string[] {
    return [...this.tokens.entries()]
      .filter(([_, data]) => data.userId === userId)
      .map(([token]) => token);
  }

  clear(): void {
    this.tokens.clear();
    this.shouldValidate = true;
    this.validationResult = null;
  }

  static alwaysValid(userId: string): StubTokenService {
    const service = new StubTokenService();
    service.setValidationResult(userId);
    return service;
  }

  static alwaysInvalid(): StubTokenService {
    const service = new StubTokenService();
    service.setShouldValidate(false);
    return service;
  }
}
