#!/bin/sh

set -eu

WORKSPACE_PATH="$1"

cd "$WORKSPACE_PATH"

bun install --frozen-lockfile
bunx prisma generate --config ./prisma.config.ts
bun run scripts/generate-swagger-from-decorators.ts
bunx biome format --write src/graphql/schema.graphql
bun run typecheck
bun run lint:fast
bun test src/
bun test ./test/architecture
bun test ./test/contracts
