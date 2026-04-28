/**
 * Outbound audit-log port the feature-flags BC needs. Kept narrow so
 * the application layer doesn't depend on the concrete
 * `AuditLogService` (which lives under `bounded-contexts/platform/common`
 * and imports Prisma + Express types).
 *
 * The Nest adapter binds this to `AuditLogService.log(...)`; the
 * Elysia bootstrap wires it the same way.
 */

export interface FlagAuditChange {
  readonly before: { enabled: boolean; enabledForRoles: string[] };
  readonly after: { enabled: boolean; enabledForRoles: string[] };
}

export interface FlagAuditPort {
  logFlagToggle(input: {
    actorId: string;
    flagKey: string;
    changes: FlagAuditChange;
    request?: unknown;
  }): Promise<void>;
}
