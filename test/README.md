# `test/` — three layers, one harness

Q70 + Q71 in the duplication audit.

The project ships three test layers; choose by *what you want to
prove*, not *what feels easy*.

| Layer | Boundary | Wires up | Lives in |
|---|---|---|---|
| **unit** | Pure domain or service in isolation | Inline stubs / `test/shared/mocks/` | `src/**/*.spec.ts` |
| **integration** | One BC's pipeline against a real Postgres + Redis | Full bounded-context composition | `test/infrastructure/integration/` |
| **e2e** | Full HTTP pipeline against a real container stack | All BCs + the production Elysia app | `test/infrastructure/e2e/` |

## Harness

Both `integration` and `e2e` boot the same `TestApp` (defined in
`test/infrastructure/shared/test-app.ts`), a fetch-based supertest
shape that drives the production `startTestApp()` bootstrap. Layers
share helpers from `test/infrastructure/shared/`.

| Helper | What it does | Layer |
|---|---|---|
| `startTestApp()` / `stopTestApp()` | Boot/kill the harness once per worker | both |
| `TestAppCache` | Caches the harness reference + lets you rebuild dependent helpers when it rebuilds | both |
| `AuthHelper` (`auth.helper.ts`) | Sign up a test user, optionally bypass email-verify / onboarding gates, drive `POST /api/auth/login`, return `{ token, refreshCookie }` | both |
| `freshInDbUser()` / `freshInDbAdmin()` (`fresh-context.ts`) | Provision a fully-onboarded user + JWT in one call (faster than HTTP signup for tests that don't exercise auth) | both |
| `CleanupHelper` (`e2e/helpers/cleanup.helper.ts`) | Tear down a test user's rows after a journey | e2e only |

## Fixture naming (Q57)

| Pattern | Returns | Side effects |
|---|---|---|
| `build*` | Pure in-memory object | none |
| `freshInDb*` | Provisioned entity | DB writes + token signing |
| `unique*` (e.g. `uniqueTestEmail`) | A random ID/email/slug string | none |

`build*` is for unit tests; `freshInDb*` is for integration/e2e.

## Seed strategies

Three intentional seed paths — pick the one that matches the layer.

1. **Per-test seed (integration)** — `setup.ts:createTestUserAndLogin()` calls `freshInDbUser()` inside `beforeEach`. Cheap because there's no HTTP roundtrip.
2. **Pre-seeded shard (e2e)** — `scripts/run-e2e.sh` invokes `_e2e-preseed.ts` once, sets `E2E_SKIP_SEED=1` for the workers, and relies on the catalog rows already being present. Avoids paying the per-shard catalog-seed cost N times.
3. **No seed (architecture/static)** — `test/static-analysis/architecture/*.spec.ts` work off the source tree directly (filesystem, regex, ts-morph).

## Static-analysis tests

`test/static-analysis/` enforces architectural rules at PR time:

- `architecture/clean-architecture/` — layering / dependency direction rules.
- `architecture/i18n-*-parity.architecture.spec.ts` — error / enum / notification parity (uses `shared/dictionary-discovery.ts`, Q60).
- `contracts/` — HTTP/SDK contract assertions (Spectral-driven).

## Static-analysis shared utilities

| File | Purpose |
|---|---|
| `static-analysis/shared/dictionary-discovery.ts` | Walks src/ + Prisma schema and extracts error codes / enum values / notification types — consumed by all three i18n parity tests |

## Where to put a new test

```
Is it covered by a single function or pure service?           → src/**/*.spec.ts
Does it need a real DB / Redis to be meaningful?              → test/infrastructure/integration/
Does it need the entire HTTP pipeline + auth gates?           → test/infrastructure/e2e/journeys/
Is it asserting an architectural invariant?                   → test/static-analysis/
```
