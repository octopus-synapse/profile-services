#!/bin/sh
# Production container entrypoint.
#
# migrate + seed live in ./migrate-and-seed.sh, which the deploy workflow runs
# as an explicit step BEFORE recreating this container. That is where a bad
# migration should fail — loudly, with the deploy going red and the old
# container still serving.
#
# Prod therefore sets RUN_MIGRATIONS_ON_BOOT=false. Anywhere else (a dev box,
# a bare `docker compose up`) the boot path still self-heals, best-effort: a
# failure is logged but must never take the whole API offline.

if [ "${RUN_MIGRATIONS_ON_BOOT:-true}" != "false" ]; then
  echo "[entrypoint] migrate + seed on boot (best-effort)…"
  ./migrate-and-seed.sh || echo "[entrypoint] WARNING: migrate/seed failed; continuing"
fi

echo "[entrypoint] starting API…"
exec bun --bun dist/main.js
