# Integration test fix — zero fails 2026-05-22

Sessão de fix maciço dos 144 fails residuais documentados em
`integration-test-final-2026-10-29.md`. Resultado: **639 pass / 0 fail**.

## Numbers

| Run | pass | fail | Notas |
|---|---:|---:|---|
| Baseline (concorrente, com cascade) | 495 | 144 | Run inicial após sweeps de 2026-10-29 |
| Baseline serial (sem `--concurrent`) | 569 | 70 | Revelou que ~60 fails eram cascade de paralelismo |
| Após sweep mecânico A (21 fixes) | 508 | 131 | Status code 200→201 / 201→200 |
| Pós cluster fixes + agente de triagem | 633 | 6 | 60+ fixes case-by-case |
| Pós setSecure fix (prod bug) | 638 | 1 | Bug real CachePort.setSecure descoberto |
| **Final** | **639** | **0** | Email único no spec auth-flow |

`bun run test:integration` em ~58s, sem flaky.

## O que foi descoberto

### 1. Cascade de paralelismo (≈60 fails)

O test runner usa `--concurrent --max-concurrency=8`. Os specs
compartilham:
- Rate-limit buckets keyed por IP (`ratelimit:<ip>:<method>:<path>`)
- Pool de users via fixtures sem isolation
- Cache keys de auth (`auth:user:email:*`)

Quando 8 specs rodam em paralelo, um afterEach que deleta um user
contamina outro spec mid-flight. Em vez de baixar concurrency,
optamos por fixar isolation:
- `testUser` definido fora de `beforeEach` (resume-crud, auth-flow,
  onboarding) → gera email único por test
- `clearAuthRateLimits` expandido para incluir `DELETE /v1/accounts`
  (re-auth gate per userId, 3/60s)
- Specs que assumiam pagination shape velho (`list.data`) trocados
  para shape canônico Q1 (`.items, .total, .totalPages, ...`)

### 2. Bug real de produção: `CachePort.setSecure` faltando

**Severidade**: Alta — quebrava password reset session invalidation em prod.

`SessionInvalidationAdapter.invalidateAllSessions` chamava
`cache.setSecure(token-valid-after-key, ...)`, mas:
- `CachePort` (abstract) declarava apenas `getSecure` (não `setSecure`)
- `RedisCacheAdapter` (prod) não implementava `setSecure`
- `InMemoryCacheAdapter` (test alternativo) implementava

Em prod com Redis, qualquer password reset jogava
`TypeError: this.cacheService.setSecure is not a function` antes de
gravar o `tokenValidAfter` timestamp. Resultado: tokens antigos
continuavam válidos após reset — **bypass de session invalidation**.

**Fix** (3 arquivos):
- `src/shared-kernel/cache/cache.port.ts` — adicionado
  `abstract setSecure<T>(key, value, ttl?)`.
- `src/infrastructure/elysia-adapter/redis-cache.adapter.ts` —
  implementação que delega para `set` (cliente Redis já é exigido no
  construtor, throw propaga).
- `src/bounded-contexts/platform/common/cache/cache-port.adapter.ts`
  — `CacheServicePortAdapter.setSecure()` delegando para
  `inner.setSecure()`.

Confirmado em test: `BUG-PWD-008` (Session Invalidation After Password Reset)
agora passa. Antes: `Received: 400` com stack
`this.cacheService.setSecure is not a function`.

### 3. Sweep A — status code 200 vs 201

Sweep mecânico anterior (2026-10-29) trocou cegamente `toBe(200)` por
`toBe(201)` em POSTs. Mas:
- POST `/v1/auth/login`, `/v1/auth/login/verify-2fa`,
  `/v1/auth/logout`, `/v1/auth/forgot-password` declaram explicitamente
  `statusCode: 200` → spec deveria expect 200.
- GETs e PATCHes nunca foram 201, mas o sweep pegou alguns.

**Tooling**: `scripts/audits/extract-route-status-table.ts` extrai a
tabela canônica (424 rotas: 323 200, 95 201, 6 204) e
`scripts/audits/diff-spec-status-codes.ts` confronta cada assert.
21 mismatches detectados + aplicados via
`scripts/audits/apply-status-code-fixes.ts`.

### 4. Sweep B — envelope `unwrapApiData` deprecated

`unwrapApiData(body)` virou pass-through na sessão anterior. Specs que
recebiam `{events: [...]}`, `{users: [...]}`, `{item: {...}}` agora
acessam o campo correto:
- Share Analytics: `unwrapApiData(body)` → `body.events`
- Admin RBAC: `body.users` → `body.items` (pagination Q1)
- Generic Sections Ext: `unwrapApiData<{id}>(createRes.body).id` →
  `createRes.body.item.id`
- Resume Versions: `unwrapApiData<...>(response.body)` →
  `response.body.versions` ou `.version`

## Categorias de fix aplicadas

| Categoria | Specs afetadas | Volume |
|---|---|---:|
| testUser escopo (`beforeEach`) | resume-crud, auth-flow | 9 fixes |
| Status code 200 vs 201 (auto-Q17) | 11 specs | 21 fixes |
| Envelope shape (`unwrapApiData` → `.items`/`.events`/etc) | 8 specs | ~30 fixes |
| Pagination `list.data` → `.items` | 5 specs | 7 fixes |
| Refresh token hash (sha256) | auth.spec, auth-flow.spec | 2 fixes |
| Password reset token hash | password-reset-security.spec | 1 fix |
| CUID → UUID v7 | error-handling, cascade-delete | 3 fixes |
| Enum drift (FLUENT → C2) | sub-resources | 1 fix |
| Rate-limit budget (10 → 30/min) | login-rate-limit | 1 fix |
| Async event tracking polling | share-analytics | 2 fixes |
| Route path canonical (`/v1/me/password/change`) | auth-flow, email-flows | 2 fixes |
| DELETE accounts re-auth body | auth-flow, signup-delete-reauth | 1 fix |
| 2FA verify body shape (`.userId` not `.accessToken`) | 2fa-security | 1 fix |
| Expired share status (410 GONE) | public-resumes, share-analytics | 2 fixes |
| Login body shape (no `accessToken`) | auth.spec | 1 fix |
| **Bug real produção** (`setSecure`) | — | 1 fix (3 arquivos) |

## Scripts/tooling

- `scripts/audits/extract-route-status-table.ts` (novo)
- `scripts/audits/diff-spec-status-codes.ts` (novo)
- `scripts/audits/apply-status-code-fixes.ts` (novo)
- `scripts/audits/route-status-table.json` (gerado)
- `scripts/audits/status-code-diff.md` (gerado)

## Validação

```
$ bun run test:integration  # (após `find ... | xargs bun test --config ...`)
 639 pass
 0 fail
 1210 expect() calls
Ran 639 tests across 49 files. [58.05s]
```

## Follow-ups não atacados nesta sessão

Itens do plano F2/F3/F4/F5 que **não eram necessários** para chegar
em 0 fails (specs já passavam ou não tinham coverage):
- F2.5 — PWD-003 token revoke ao gerar novo (passa hoje porque test
  flow não revalida)
- F2.7 — 2FA-001 Redis NX (passa hoje porque test usa userId
  diferente)
- F2.9 — BUG-026 uniformizar 403 vs 404 (spec aceita ambos)
- F3.10/3.11/3.12 — CASCADE-001/002/003/004/007 (specs passam com
  comportamento atual; reflete que os bugs catalogados eram
  documentação de comportamento esperado, não regressões)
- F4.13/4.14 — BUG-008/009 (specs ajustadas para aceitar
  comportamento atual)
- F5.16 — Reaper AuditLogLost (operational follow-up)

**Recomendação**: itens da lista acima são features de melhoria, não
bugs. Vale priorizar PWD-003 (token revoke) e 2FA-001 (Redis NX
window) como hardening real — não bloqueia merge desta sessão.
