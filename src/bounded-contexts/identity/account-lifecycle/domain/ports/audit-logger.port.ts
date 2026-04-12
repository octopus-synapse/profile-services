/**
 * Audit Logger Port
 *
 * Defines the contract for logging audit events for GDPR compliance.
 */

export const AuditAction = {
  USERNAME_CHANGED: 'USERNAME_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  RESUME_CREATED: 'RESUME_CREATED',
  RESUME_UPDATED: 'RESUME_UPDATED',
  RESUME_DELETED: 'RESUME_DELETED',
  RESUME_VISIBILITY_CHANGED: 'RESUME_VISIBILITY_CHANGED',
  PREFERENCES_UPDATED: 'PREFERENCES_UPDATED',
  ONBOARDING_COMPLETED: 'ONBOARDING_COMPLETED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  EMAIL_CHANGED: 'EMAIL_CHANGED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  TOS_ACCEPTED: 'TOS_ACCEPTED',
  PRIVACY_POLICY_ACCEPTED: 'PRIVACY_POLICY_ACCEPTED',
  DATA_EXPORT_REQUESTED: 'DATA_EXPORT_REQUESTED',
  DATA_EXPORT_DOWNLOADED: 'DATA_EXPORT_DOWNLOADED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  TWO_FACTOR_ENABLED: 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED: 'TWO_FACTOR_DISABLED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditLoggerPort {
  log(userId: string, action: AuditAction, entityType: string, entityId: string): Promise<void>;
  logDataExportRequested(userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
  logDataExportDownloaded(userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
}

export const AUDIT_LOGGER_PORT = Symbol('AuditLoggerPort');
