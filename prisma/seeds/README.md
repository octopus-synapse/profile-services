# Seeds

Three buckets, each a composition root with one responsibility:

- **`shared/`** — reference catalogs the running app depends on, needed in **dev
  and prod**. `runSharedSeeds(prisma)` is the single source of truth for this
  set. **Invariant:** idempotent (upsert by key), no external I/O, no per-row
  scaling cost — it runs on every deploy via the container entrypoint.
- **`dev/`** — fixtures + catalogs that must **not** run in production: test
  users (known passwords), external-API seeders (tech-skills, jobs), seeders
  needing an admin owner (resume styles, jobs, dredd), and table-scaling
  backfills (usernames, analytics). `runDevSeeds(prisma, { adminId })`.
- **`prod/`** — prod-only seeds. Currently empty (prod = shared); extension
  point. `runProdSeeds()`.

## Runners

- `prisma/seed.ts` (DEV) → `runSharedSeeds` → `seedAdminUser` → `runDevSeeds`.
  Invoked by `make dev` (the dev compose runs `bun run prisma/seed.ts` on start),
  `prisma db seed`, and `migrate reset`.
- `prisma/seed.deploy.ts` (PROD) → `runSharedSeeds` → `runProdSeeds`. Invoked by
  `docker-entrypoint.sh` (`bun dist/seed.deploy.js`) on every deploy.

## Not a seed

One-shot data backfills live in `prisma/data-migrations/` (e.g.
`migrate-profile-links-to-sections.seed.ts`) — run manually, never wired into a
runner.
