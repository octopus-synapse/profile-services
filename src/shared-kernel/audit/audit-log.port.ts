/**
 * Canonical audit-log port.
 *
 * Q50 in the duplication audit. Replaces the three drift-prone local
 * shapes (account-lifecycle `AuditLoggerPort`, authorization-local
 * `AuditLogPort`, platform `AuditLogService`) with one cross-BC
 * contract.
 *
 * The action type is a string (not the Prisma `AuditAction` enum)
 * because some BCs need codes that aren't yet in the enum
 * (`ACCESS_MODIFIER_APPLIED`, `ACCESS_MODIFIER_REVOKED`,
 * `FEATURE_FLAG_TOGGLED` etc.). When the project commits to
 * Prisma-only enums (Q43-style sweep), tighten the type here.
 */

export interface AuditLogEntry {
  /** User who performed the action. */
  readonly userId: string;
  /** SCREAMING_SNAKE_CASE action identifier. */
  readonly action: string;
  /** Entity domain type, e.g. 'User', 'Resume', 'AccessModifier'. */
  readonly entityType: string;
  /** Entity primary key. */
  readonly entityId: string;
  /** Free-form payload — before/after snapshots, request metadata, etc. */
  readonly metadata?: Record<string, unknown>;
}

export interface AuditLogOptions {
  /**
   * When `true`, audit-write failures are logged and swallowed; the
   * parent operation continues. Default `false` — per Q51, audit
   * failures are compliance failures and propagate as
   * `AuditLogFailedException`.
   */
  readonly lenient?: boolean;
}

export abstract class AuditLogPort {
  abstract log(entry: AuditLogEntry, options?: AuditLogOptions): Promise<void>;
}
