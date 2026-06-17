#!/bin/sh
# Production container entrypoint.
#
# Order matters: schema must exist before seeding, and both must run before
# the API serves traffic that reads reference data (e.g. the onboarding
# session resolver needs section-type field translations).
#
# migrate + seed are best-effort: a failure is logged loudly but does NOT
# abort startup, so a migration/seed hiccup can never take the whole API
# offline. `prisma migrate deploy` and the deploy seed are both idempotent.

echo "[entrypoint] prisma migrate deploy…"
bunx prisma migrate deploy --config ./prisma.config.ts \
  || echo "[entrypoint] WARNING: migrate failed; continuing"

echo "[entrypoint] seeding reference catalogs…"
bun dist/seed.deploy.js \
  || echo "[entrypoint] WARNING: deploy seed failed; continuing"

echo "[entrypoint] starting API…"
exec bun --bun dist/main.js
