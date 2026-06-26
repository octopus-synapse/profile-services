#!/usr/bin/env bash
#
# Dev-only e2e runner — NO GHCR image required.
#
# The e2e suite boots the production Elysia bootstrap *in-process* on the
# host (see `test/infrastructure/shared/test-app.ts`), so it runs your
# local working tree directly. It only needs datastores reachable on
# localhost:
#   - Postgres + Redis  → the isolated `docker-compose.test.yml` stack
#     (ports 5433 / 6380, DB `profile_test`).
#   - MinIO             → the already-running dev MinIO (`profile-minio-dev`
#     on localhost:9000). DOCX export uploads here, proving object storage
#     end-to-end. PDF/banner additionally need typst/chromium; this script
#     points Puppeteer at the host Chrome, and PDF degrades gracefully
#     (502) where typst isn't installed locally.
#
# The containerized path (`run-e2e.sh` + `docker-compose.e2e.yml`, which
# now bundles its own MinIO) is still used in CI with the published image.
#
# Usage:
#   bun run test:e2e:dev                       # full suite
#   bun run test:e2e:dev <path/to/one.spec.ts> # a single spec
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=infra/docker/docker-compose.test.yml

echo "▶ bringing up test datastores (postgres:5433, redis:6380)…"
docker compose -f "$COMPOSE" up -d postgres-test redis-test

echo "▶ waiting for postgres-test to be healthy…"
until [ "$(docker inspect --format '{{.State.Health.Status}}' profile-postgres-test 2>/dev/null)" = "healthy" ]; do
  sleep 2
done

export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/profile_test
echo "▶ applying migrations + seed to profile_test…"
bunx prisma migrate deploy --config ./prisma.config.ts
bun run prisma/seed.ts

echo "▶ ensuring dev MinIO bucket exists…"
docker exec profile-minio-dev sh -c \
  "mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null 2>&1; \
   mc mb local/profile-uploads --ignore-existing >/dev/null 2>&1" \
  || echo "  (could not reach profile-minio-dev — start the dev stack first)"

echo "▶ running e2e host-side (dev MinIO, host Chrome)…"
REDIS_HOST=localhost \
REDIS_PORT=6380 \
JWT_SECRET=e2e_test_secret_key_minimum_32_characters_long \
MINIO_ENDPOINT=http://localhost:9000 \
MINIO_ACCESS_KEY=minioadmin \
MINIO_SECRET_KEY=minioadmin \
MINIO_BUCKET=profile-uploads \
MINIO_PUBLIC_ENDPOINT=http://localhost:9000 \
PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-/usr/bin/google-chrome}" \
NODE_ENV=test \
  bun test --config=config/bunfig.e2e.toml "$@"

echo "✓ e2e (dev) complete. Datastores left running for re-runs; tear down with:"
echo "    docker compose -f $COMPOSE down -v"
