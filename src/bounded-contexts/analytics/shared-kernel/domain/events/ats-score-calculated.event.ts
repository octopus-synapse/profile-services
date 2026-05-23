// P2-105 — single canonical event under `analytics/domain/events`.
// This file re-exports from the BC-root location so existing
// imports keep working without two diverging classes (which would
// be `instanceof`-incompatible and break event-bus dispatch).
export * from '../../../domain/events/ats-score-calculated.event';
