/**
 * Validate 2FA Port (Inbound)
 *
 * Exposes 2FA validation to other bounded contexts (e.g. authentication).
 */

export interface Validate2faResult {
  valid: boolean;
  method: 'totp' | 'backup_code' | null;
}

export interface Validate2faPort {
  validate(userId: string, code: string): Promise<Validate2faResult>;
  isEnabled(userId: string): Promise<boolean>;
}

export const VALIDATE_2FA_PORT = Symbol('Validate2faPort');
