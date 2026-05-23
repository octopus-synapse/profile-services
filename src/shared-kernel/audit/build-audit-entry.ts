/**
 * Helper used by the per-BC audit handlers (P1-035) to build an
 * `AuditLogEntry` from event-derived primitives. Handlers stay thin
 * and just call this with their own action / entityType.
 *
 * Composition over inheritance: every audit handler holds an
 * `AuditLogPort` reference + a few literal strings (action, entityType)
 * and invokes `buildAuditEntry` per event. No abstract base class —
 * keeps the audit handlers framework-free regardless of which
 * `DomainEvent` shape (shared-kernel vs identity local) the BC uses.
 */

import type { AuditLogEntry } from './audit-log.port';

export interface BuildAuditEntryInput {
  /** SCREAMING_SNAKE_CASE — `LOGIN_FAILED`, `EXPORT_REQUESTED`, etc. */
  readonly action: string;
  /** `User`, `Resume`, `Job`, etc. */
  readonly entityType: string;
  /** Entity primary key (usually the event's `aggregateId`). */
  readonly entityId: string;
  /** Acting user. When the event's aggregate IS the user, pass that;
   *  when an admin acts on a different entity, pass the admin's id. */
  readonly userId: string;
  /** Free-form payload from the event (and any handler-side enrichment).
   *  Typed event payloads (interfaces with explicit fields) are
   *  accepted directly — no `Record` cast required at the call site. */
  readonly payload?: object;
  /** Stable string used by the catalog — usually `event.eventType`. */
  readonly eventType?: string;
}

export function buildAuditEntry(input: BuildAuditEntryInput): AuditLogEntry {
  return {
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: {
      ...(input.eventType ? { eventType: input.eventType } : {}),
      ...((input.payload ?? {}) as Record<string, unknown>),
    },
  };
}
