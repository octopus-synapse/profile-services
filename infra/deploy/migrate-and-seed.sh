#!/bin/sh
# Schema migration + idempotent reference seeds.
#
# Single source of truth for "bring the database up to date", called from two
# places:
#   - the deploy workflow, as an explicit step BEFORE the new container is
#     recreated, so a bad migration fails the deploy loudly;
#   - docker-entrypoint.sh on boot, but only when RUN_MIGRATIONS_ON_BOOT is
#     not "false" (dev boxes, a bare `docker compose up`).
#
# Strict on purpose: `set -e` means the caller decides whether a failure is
# fatal. The deploy step lets it abort; the boot path swallows it so a hiccup
# can never take the whole API offline.
#
# Order matters: the schema must exist before seeding, and both must land
# before the API serves traffic that reads reference data (the onboarding
# session resolver needs section-type field translations — this is what broke
# in v0.2.7).
set -e

echo "[migrate-and-seed] prisma migrate deploy…"
bunx prisma migrate deploy --config ./prisma.config.ts

echo "[migrate-and-seed] seeding reference catalogs…"
bun dist/seed.deploy.js

echo "[migrate-and-seed] done."
