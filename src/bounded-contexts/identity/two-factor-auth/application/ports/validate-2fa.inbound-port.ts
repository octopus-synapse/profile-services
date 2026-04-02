/**
 * Validate 2FA Inbound Port
 *
 * Exposes 2FA validation to other bounded contexts (e.g. authentication).
 */

export interface Validate2faResult {
  valid: boolean;
  method: 'totp' | 'backup_code' | null;
}

export interface Validate2faInboundPort {
  validate(userId: string, code: string): Promise<Validate2faResult>;
  isEnabled(userId: string): Promise<boolean>;
}

export const VALIDATE_2FA_INBOUND_PORT = Symbol('Validate2faInboundPort');
