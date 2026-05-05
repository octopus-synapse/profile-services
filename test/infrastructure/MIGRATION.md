# E2E + integration suite migration

The Phase-2 cutover (Nest → Elysia + Bun) replaced the
`Test.createTestingModule({ imports: [AppModule] })` + `supertest`
combo that the original e2e + integration suites depended on. The
spec files survive under `test/infrastructure/_legacy/` and need to
be converted one-by-one to the new harness in `shared/`.

## What changed

Old shape:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';

const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
const app = moduleFixture.createNestApplication();
await app.init();

await request(app.getHttpServer())
  .post('/api/v1/foo')
  .send({ bar: 1 })
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

New shape:

```ts
import { startTestApp, stopTestApp, AuthHelper, type TestApp } from '../shared';

let app: TestApp;
let auth: AuthHelper;

beforeAll(async () => {
  app = await startTestApp();
  auth = new AuthHelper(app);
});
afterAll(async () => {
  await stopTestApp();
});

const user = await auth.registerAndLogin();
const res = await app.request
  .post('/api/v1/foo')
  .send({ bar: 1 })
  .set(auth.bearer(user));
expect(res.status).toBe(200);
```

## Conversion steps for a `_legacy/*.spec.ts` file

1. Move the file from `test/infrastructure/_legacy/<kind>/foo.spec.ts`
   to `test/infrastructure/<kind>/foo.spec.ts`.
2. Replace the imports:
   - `Test, TestingModule` from `@nestjs/testing` → drop
   - `INestApplication` from `@nestjs/common` → drop
   - `import request from 'supertest'` → drop
   - `AppModule` from `@/app.module` → drop
   - Add: `import { startTestApp, stopTestApp, AuthHelper, type TestApp } from '../shared';`
3. Replace the `beforeAll(...)` setup block with the canonical
   `startTestApp()` + `AuthHelper` instantiation shown above.
4. Replace `afterAll(async () => app.close())` with
   `afterAll(async () => stopTestApp())`.
5. Replace every `request(app.getHttpServer())` with `app.request`.
6. Replace `.expect(<status>)` (which threw on mismatch) with an
   explicit `expect(res.status).toBe(<status>)` after the await — the
   shim's `.expect()` is a no-op for source-compat only.
7. Cookie jar is no longer auto-managed. If the legacy test relied on
   `agent` semantics, capture `res.setCookie` and pass back via
   `.set('Cookie', cookies.join('; '))`.

## Helpers worth porting from `_legacy/`

The fixtures + helpers under `_legacy/e2e/{fixtures,helpers}/` are
mostly framework-free DB seeders that work as-is once their
`INestApplication` constructor parameter is replaced with `TestApp`.
Port them into `test/infrastructure/shared/` when the first suite
that needs them is converted — duplicate-and-modify is cheap, sharing
the DB seed code across suites is the win.

## What's already converted

- `test/infrastructure/e2e/health.e2e.spec.ts` — health probes
- `test/infrastructure/integration/badges.integration.spec.ts` — public + JWT-gated badges

## CI

`bunfig.e2e.toml` + `bunfig.integration.toml` point at the new dirs;
`_legacy/` is invisible to CI. As suites get migrated, the `_legacy/`
tree shrinks. When it's empty, delete it.
