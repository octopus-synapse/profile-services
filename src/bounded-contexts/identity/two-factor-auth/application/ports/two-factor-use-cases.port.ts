/**
 * Two-Factor Use Cases Inbound Ports
 *
 * Symbols for injecting 2FA use-cases via NestJS DI.
 */

export const SETUP_2FA_PORT = Symbol('Setup2faPort');
export const VERIFY_AND_ENABLE_2FA_PORT = Symbol('VerifyAndEnable2faPort');
export const DISABLE_2FA_PORT = Symbol('Disable2faPort');
export const GET_2FA_STATUS_PORT = Symbol('Get2faStatusPort');
export const REGENERATE_BACKUP_CODES_PORT = Symbol('RegenerateBackupCodesPort');
