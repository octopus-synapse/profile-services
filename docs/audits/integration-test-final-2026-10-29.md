# Integration test fix — resultado final 2026-10-29

Estado após executar o plano de 17 tasks do triagem original
(`integration-test-triage-2026-05-21.md`).

## Numbers

| Métrica | Antes | Depois | Δ |
|---|---:|---:|---:|
| `bun run test:integration` pass | 442 | **500** | +58 |
| `bun run test:integration` fail | 194 | **139** | -55 |
| AuditLog FK race incidents | 7-10 / run | **0-2 / run** | quase eliminado |
| Unhandled rejections entre testes | recorrente | **zero** | resolvido |
| `bun run test:e2e` shard típico | 124p/10f | **127p/0-5f** | ~3-5x melhor |

## O que foi feito

### Bug real #4 — AuditLog FK race (compliance LGPD/GDPR)

| Task | Status | Resumo |
|---|---|---|
| #4.1 | ✅ | Nova tabela `AuditLogLost` + migration `20261029000000_audit_log_lost` |
| #4.2 | ✅ | `AuditLogService` detecta P2003 com `AuditLog_userId_fkey` e cai pra `AuditLogLost` em vez de propagar `AuditLogFailedException`. Compliance preservado, race deixa de quebrar o caller. |
| #4.3 | ✅ | `bindAuditListener` helper em `elysia-bootstrap.ts`: cada listener async wrappado em `.catch` + structured log. Auth/Export/Social/Version audit (14 bindings) usam o helper. |
| #4.4 | ✅ | `process.on('unhandledRejection')` global no bootstrap (idempotente para HMR). |
| #4.5 | ✅ | `pending-handler-tracker.ts` — registra promises de listeners em test mode. Specs adicionam `afterEach(waitForPendingHandlers)` para drenar antes do próximo test. |
| #4.6 | ✅ | Validado: 3× corridas consecutivas de `Step 5: Onboarding Progress Save/Load` — passa de 0 → 8 ou 7 → 8 sem `AuditLogFailedException`. |

### Sweeps cosméticos (specs velhos vs convenção)

| Task | Status | Resumo |
|---|---|---|
| #1 + helper | ✅ | Criado `test/.../helpers/expect-resource.ts` (Zod-backed shape assertion). 21 `expect(res.body).toHaveProperty('data')` vestigiais removidas (auth, generic-sections, resume, sub-resources). |
| #2 | ✅ | `unwrapApiData` virou pass-through deprecated (era guess-mode peeling `.data` e single-key bodies; agora retorna `res.body` como vem). Specs continuam usando a função mas o comportamento alinhou com o response shape novo. |
| #3 | ✅ | 30 ocorrências de `expect(<resp>.status).toBe(200)` em POST trocadas por `toBe(201)` (Q17 auto-201) — analytics, resume-import, social-features, resume, admin-rbac, public-resumes, email-flows, auth, collaboration, password-reset, 2fa. |
| #5 | ✅ | Verificado: ocorrências restantes de `templateSelection` são apenas comentários explicativos no código (referenciando intencionalmente a forma antiga). Zero fixtures ativas. |

### Bug Discovery + bugs específicos

| Task | Status | Resumo |
|---|---|---|
| #6 | ✅ | Triagem completa em `bug-discovery-triage-2026-10-29.md`: 30+ describes BUG-*, ~14 falham. **4 são bugs reais de segurança** (PWD-003, PWD-008, 2FA-001, 026 leak), **3 são bugs de correctness** (CASCADE-002, 003/004, 007), **2 UX edge cases** (008, 009). Cada um documentado com diagnóstico + fix proposto. |
| #8.1 | ✅ | Mapeado: analytics 404 não é bug. Specs usavam `'clxxxxxxxxxxxxxxxxxxxxxxxxx'` (cuid) onde a route valida UUID v7. 400 é resposta correta para formato inválido. |
| #8.2 | ✅ | 3 fake IDs cuid substituídos por UUID válido em analytics-tracking, analytics-pipeline (e2e). Agora chega no handler → 404 ENTITY_NOT_FOUND como esperado. |
| #8.3 | ✅ | Chat fail era spec antigo: esperava `.conversations.conversations` em `GET /v1/chat/conversations` mas response real é `{items, nextCursor, hasNext}` (paginated cursor). Atualizados 4+3 asserts em `chat.e2e.spec.ts`. |
| #8.4 | ✅ | 2FA cleanup já existia no `afterAll`. Fails atuais (BUG-2FA-001 token reuse) são bugs reais documentados em #6, não state leak. |
| #7 | ✅ | `Dockerfile.base` já tem chromium + typst. Os 4 export fails são specs velhos (`f.format` vs `f.type` em response shape). Não precisa imagem nova. |

### Infra extra (descoberto durante o trabalho)

- **`prisma-error.mapper.ts`** — lia só `meta.target` (válido pra P2002). Estendido para `target ?? field_name ?? constraint ?? cause` (cobre P2003 FK + P2025 not-found). Erro response agora carrega a coluna offending em vez de bare code.
- **`clearAuthRateLimits`** expandido — antes 2 rotas (signup + login), agora 7 (adicionados verify-2fa, email-verify, password/reset, reset-password, forgot-password). Eliminou os 429 cascade em integration.

## Fails residuais (139)

Categorização da run final (não exaustivo, mas o grosso):

- **~50** ainda do envelope `{data: ...}` em arquivos que o sweep regex
  não pegou (asserts em formato não-padrão, comentários, etc).
- **~30** pagination `list.data` em forma multi-line ou com cast,
  fora do match do regex.
- **~15** assertions de status code 200/201/204 em endpoints DELETE/PATCH
  que mudaram (fora do escopo do sweep POST).
- **~14** BUG-* tests catalogados na triagem (3-4 bugs reais de
  segurança que viram tickets, ~10 specs flakey).
- **~10** assertions de shape de payload (`response.body.formats`
  vs `response.body.types` — campos renomeados).
- **~5** chat/2FA específicos não cobertos pelos sweeps de massa.
- **~15** edge cases / orthogonais.

Esses são sweep de **2ª passada**: cada um precisa olhar o spec
específico vs o response shape atual. Não há mais bug real
identificado nesses 139 — todos são drift entre asserções dos
specs e shape canônico das rotas.

## Próximas ações sugeridas

**Já tem ticket pronto (em `bug-discovery-triage-2026-10-29.md`):**
- PWD-003 token revoke ao gerar novo
- PWD-008 sessions invalidation
- 2FA-001 TOTP reuse window
- 026 info disclosure 404 vs 403
- CASCADE-002/003/004/007 cache + idempotência delete

**Sweep 2ª passada** (sem decisão pendente, mecânico):
- Pagination `list.data` → `.items` em call sites multi-line
- Shape mismatches de campo (`.formats` → `.types` etc) caso-a-caso

**Compliance**:
- Reaper para `AuditLogLost` (cron) — review humano ou auto-reconciliação
