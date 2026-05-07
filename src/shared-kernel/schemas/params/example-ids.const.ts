/**
 * Deterministic identifiers used as OpenAPI parameter examples.
 *
 * These appear in the generated `swagger.json` so contract tooling
 * (Dredd) can expand URI templates like `/users/{userId}` without
 * guessing. The same values back the Dredd fixture seed
 * (`prisma/seeds/dredd-fixtures.seed.ts`) so each example resolves to
 * a real row when the contract suite hits the live API.
 */

export const EXAMPLE_USER_ID = '01900000-0000-7000-a000-000000000020';
export const EXAMPLE_RESUME_ID = '01900000-0000-7000-a000-000000000010';
export const EXAMPLE_JOB_ID = '01900000-0000-7000-a000-000000000030';
export const EXAMPLE_GENERIC_ID = '01900000-0000-7000-a000-000000000001';
export const EXAMPLE_SLUG = 'fixture-slug';
