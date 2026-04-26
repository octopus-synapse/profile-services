/**
 * Validate 2FA Inbound Port
 *
 * Exposes 2FA validation to other bounded contexts (e.g. authentication).
 */

export interface Validate2faResult {
  valid: boolean;
  method: 'totp' | 'backup_code' | null;
}

export abstract class Validate2faInboundPort {
  abstract validate(userId: string, code: string): Promise<Validate2faResult>;
  abstract isEnabled(userId: string): Promise<boolean>;
}
