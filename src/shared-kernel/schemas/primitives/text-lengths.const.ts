/**
 * Text field lengths that a database column also enforces.
 *
 * These live apart from the schemas that use them because the number has to
 * match a migration: `Resume.headline` is `VarChar(120)`, so a DTO that
 * allowed 200 would fail at the driver instead of at validation, with a
 * worse message. Naming them here makes the pairing visible in one place.
 */

/** `Resume.headline` — `@db.VarChar(120)`. */
export const HEADLINE_MAX_LENGTH = 120;

/** `Resume.targetRoleLabel` — the free-text role a résumé aims at. */
export const ROLE_LABEL_MAX_LENGTH = 120;
