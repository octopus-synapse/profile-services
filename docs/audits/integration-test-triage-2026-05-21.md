# Integration test triage — bugs reais vs specs velhos

Baseline antes da triagem: 442 pass / 194 fail. Depois do sweep de
`clearAuthRateLimits` (5 buckets IP-keyed) e do refactor
resume-style: **481 pass / 158 fail** (de 639 testes).

Dos 158 fails restantes, eles caem em 8 categorias bem definidas
listadas abaixo, **só uma das quais é bug real de produção** (a #4).
O resto são specs velhos pinados em convenções pré-refactor.

---

## #1 — Spec espera envelope `{data: ...}` em response, endpoint não envelopa mais (~50 fails)

**Padrão**

```
error: expect(received).toHaveProperty(path)
Expected path: "data"
```

**Por que falha**

A convenção Q18 (`profile-services/CLAUDE.md`) diz: routes retornam o
recurso direto, **sem** `{data: ...}` wrapper. O envelope só existe
nas rotas paginadas, e ali a forma é `{items, total, page, limit, totalPages, hasNext, hasPrev}`
(Q1) — também não `{data: [...]}`.

Os specs ainda fazem `expect(res.body).toHaveProperty('data')` em
endpoints como `GET /v1/resumes/:id/sections`, `GET /v1/auth/me`,
`POST /v1/auth/signup`, `POST /v1/resumes/:id/sections/:type/items`,
todo o "Generic Sections Smoke" e "Resume Smoke". Esses são specs
da era pré-Q18.

**É bug de produção?** Não. O frontend já consome o shape novo
(`apps/web/src/lib/...` usa `.items`, `.sections`, etc. direto).

**Action**: `git grep "toHaveProperty('data')" test/infrastructure/integration` retorna a lista. Apagar a assertion ou trocar pelo
campo top-level real (`res.body.sections`, `res.body.items`, etc).
Ticket único, ~30min de sweep.

**Specs afetados (amostra)**: `sub-resources.integration.spec.ts`,
`resume.integration.spec.ts`, `generic-sections.integration.spec.ts`,
`auth.integration.spec.ts`, `public-resumes.integration.spec.ts`.

---

## #2 — Spec usa `list.data` em paginação, resposta é `list.items` (~30 fails)

**Padrão**

```
const list = unwrapApiData<{ data: unknown[]; meta: Record<string, unknown> }>(res.body);
expect(Array.isArray(list.data)).toBe(true);
                                  ↑
                              Received: false
```

**Por que falha**

`PaginatedResponseSchema` (Q1) emite `{items, total, page, limit, totalPages, hasNext, hasPrev}`. O `unwrapApiData` helper só desempacota
o `body.data` se ele existir — neste caso retorna o body inteiro
(`{items: [...], ...}`). Aí `list.data` é `undefined`, `Array.isArray(undefined) === false`.

**É bug de produção?** Não. Frontend usa `.items` (vê
`apps/web/CLAUDE.md` seção "Pagination").

**Action**: substituir `list.data` por `list.items` nos specs. Mesma
varredura do #1. ~15min.

**Specs afetados**: `resume.integration.spec.ts`,
`public-resumes.integration.spec.ts`,
`share-analytics.integration.spec.ts` e outros.

---

## #3 — `Expected 200, Received 201` em POST (auto-201, ~15 fails)

**Padrão**

```
expect(response.status).toBe(200);
                              ↑
                          Received: 201
```

Acontece em endpoints como `POST /v1/resumes/:id/analytics/track-view`,
`POST /v1/onboarding`, etc.

**Por que falha**

Convenção Q17 (CLAUDE.md): "O Elysia mounter seta 201 quando um
POST handler não declara `statusCode`. Não retorne success-data com
um 200 manual de um POST." Os specs antigos esperavam 200 porque era
o status que o controller Nest legado retornava.

**É bug de produção?** Não — 201 Created é semanticamente correto
para POST que cria recurso.

**Action**: trocar `.toBe(200)` por `.toBe(201)` (ou
`toContain([200, 201])` para endpoints idempotentes). ~10min.

---

## #4 — 🚨 BUG REAL: Race condition no AuditLog FK violation

**Padrão (log do server)**

```
[AuditLogService] error: Audit log write failed — propagating to caller {
  userId: "019e4bbc-…",
  action: "SESSION_CREATED",
  entityType: "Session",
  reason: "Foreign key constraint violated on the constraint: AuditLog_userId_fkey"
}
AuditLogFailedException: Audit log failed:
  Invalid `this.prisma.auditLog.create()` invocation
  Foreign key constraint violated on the constraint: AuditLog_userId_fkey
```

**Reproduz**

Trivial em test: dois testes back-to-back fazem signup → login → afterEach
deleta o user. O handler async de `UserLoggedInEvent` / `SessionCreatedEvent`
ainda está processando quando o user é deletado. Ao chegar no
`prisma.auditLog.create({userId})`, o user já não existe → P2003 →
`AuditLogFailedException` (strict mode rethrow).

**Em produção**

Cenário plausível: user faz login → backend retorna 200 imediatamente
→ admin/user-self-delete o user na mesma janela de ~50ms antes do
handler async gravar o audit. Audit log é PERDIDO (compliance gap LGPD/GDPR)
e a request HTTP que sucedeu silenciosamente vira `unhandledRejection`
no Node.

A request original já retornou 200 — o cliente não vê. O log fica
perdido. **Esse é o bug**.

**Causa raiz exata**

`InMemoryEventBusAdapter.publish(event)` chama `EventEmitter.emit(type, event)` que invoca listeners sync. Listeners async (caso de
todos os `AuthAuditHandler.on*`) retornam Promise; `emit()` ignora a
Promise. Se o handler rejeita, vira `unhandledRejection`.

Os handlers são registrados via `eventBus.on(...)` direto
(`elysia-bootstrap.ts:819-827`), não via `registerHandler` (que
envolveria em try/catch + logger). Logo a falha é silenciada apenas
pelo Node default unhandledRejection — não há retry, dead-letter, nem
alarme.

Não é bug específico da auth: o mesmo padrão aparece em
`ExportAuditHandler`, `SocialAuditHandler`, `VersionAuditHandler` etc.
(mesmo padrão em `elysia-bootstrap.ts:837-870`).

**Severidade**

Compliance-relevante. LGPD Artigo 16 / GDPR Article 30 exigem audit
trail completo de eventos de autenticação. Um audit perdido por
race condition viola.

Frequência depende de quão rápido user-delete acontece pós-login —
provavelmente raro em prod (delete-account flow tem confirmação +
re-auth), mas existe.

**Fix proposto** (ordem de menor → maior intrusão):

1. **Mitigação imediata**: nos lifecycle handlers que fazem audit
   write, mover `prisma.auditLog.create` para uma transação que
   também verifica `User.exists(userId)` antes. Se não existe, log
   warning "audit lost: user already removed" e continua. Resolve o
   FK violation mas perde audit.

2. **Retry com queue**: tentar `prisma.auditLog.create`, em caso de
   P2003 publicar `AuditLostEvent(originalEvent, reason)` em queue
   persistente (BullMQ) para reaper humano. Mantém compliance.

3. **Switch para `publishAsync` no caller**: `login.use-case.ts:184`
   e `create-session.use-case.ts:68` chamam `publish()` (fire-and-forget).
   Trocar para `await publishAsync()` propaga o erro do handler ao
   endpoint → user vê 500 se o audit falhar. Trade-off: audit DB
   indisponível ⇒ login indisponível.

Recomendo combinar (2) + também usar `registerHandler` com logger no
binding (envolve em try/catch) para que `publish` não vaze
`unhandledRejection` — o log dentro do try/catch já é a auditoria de
"falha do audit", que vai pro pipeline de observabilidade existente.

**Specs flaky por causa disso**: tudo em `Complete Onboarding Flow >
Step 5: Onboarding Progress Save/Load`, alguns em `Onboarding Security
& Race`, alguns em `Auth Flow Integration > Account Management`.

---

## #5 — Specs ainda usam `templateSelection`/`Resume.template` (~5 fails)

**Padrão**

```
templateSelection: { template: 'PROFESSIONAL', palette: 'DEFAULT' },
```

**Por que falha**

São fixtures velhas do refactor `resume-style-canonical`. Já corrigi os
ovbios (`onboarding-flow`, `resumes.fixture`, `onboarding.integration`),
mas alguns specs reusam essas fixtures indiretamente.

**É bug de produção?** Não.

**Action**: `git grep -i templateSelection test/` e trocar para
`resumeStyleId: null`. ~10min.

---

## #6 — Specs labeled "Bug Discovery Tests" (~12 fails)

**Padrão**

Specs como `Password Reset Security - Bug Discovery Tests > BUG-PWD-005:
Expired Token Handling`, `2FA Security - Bug Discovery Tests >
BUG-2FA-001: Token Reuse Vulnerability`, `Resume Delete Cascade -
Bug Discovery Tests > BUG-CASCADE-004`.

**Por que falha**

Esses specs **documentam bugs conhecidos** que ainda não foram
corrigidos. O ticket tracker é `docs/BUG_DISCOVERY_REPORT.md`. Eles
são intencionalmente vermelhos — `expected to fail` na descrição.

**É bug de produção?** **Sim** — cada um descreve um bug específico.
Mas eles estão catalogados desde antes do refactor; o triagem deles
é uma sessão separada.

**Action**: ler `BUG_DISCOVERY_REPORT.md` (não inspecionei aqui) e
priorizar por severidade. Não é trabalho dessa varredura.

---

## #7 — Export PDF/DOCX (~4 fails)

**Padrão**

```
expect(response.status).toBe(200);
                              ↑
                          Received: [200, 500]  // toleration array
```

**Por que falha**

O test container provavelmente não tem `puppeteer` / `typst` binaries
instalados ou disponíveis. Os tests usam `toContain([200, 500])` pra
tolerar o cenário, mas algum delta retornou outro código (404 quando
o resume foi deletado pelo afterEach do test concorrente, etc).

**É bug de produção?** Não. Os specs tem fallback explícito; falha
quando o ambiente CI não satisfaz o setup.

**Action**: rodar `bun run test:integration` num container que tenha
typst+puppeteer pré-instalados (`profile-services/docker-compose.test.yml`
provavelmente). Backlog.

---

## #8 — Chat / 2FA disable / Analytics 404 (~6 fails)

Padrões diversos, baixo volume.

- **Chat conversa**: spec espera `conversations.length === 2` mas a
  lista veio vazia. Provavelmente race na criação da conversa entre
  dois user accounts.
- **2FA disable**: spec espera 200 mas o user já tem 2FA disabled.
  State leak entre specs (afterEach incompleto).
- **Analytics 404 no resume não-existente**: spec usa um UUID que
  passa a validation Zod mas não existe no DB. Backend retorna 400
  com `INVALID_FOREIGN_KEY` em vez de 404 com `ENTITY_NOT_FOUND`
  porque a rota tenta um `.findUnique({id})` que vira P2025 só se
  houver um WHERE acoplado a outro FK. Provavelmente bug no handler
  (deve checar `if (!resume) throw EntityNotFoundException` antes
  de qualquer write).

**Action**: triagem caso-a-caso, baixa prioridade.

---

## Resumo final

| Categoria | Volume | É bug? | Esforço |
|---|---:|---|---|
| #1 Envelope `{data:...}` | ~50 | Não | 30min |
| #2 Pagination `.data` vs `.items` | ~30 | Não | 15min |
| #3 200 vs 201 | ~15 | Não | 10min |
| #4 AuditLog FK race | flaky 3-7 | **Sim, prod** | 1-2 dias (opção 2) |
| #5 templateSelection legacy | ~5 | Não | 10min |
| #6 Bug Discovery Tests | ~12 | **Sim, pré-existentes** | sessão separada |
| #7 Export PDF/DOCX env | ~4 | Não (infra) | 30min |
| #8 Diversos | ~6 | Misto | caso-a-caso |
| **Total triado** | **~122** | | |

Os ~36 restantes são variações dos mesmos padrões ou cascata do #4
quando o `# Unhandled error between tests` corrompe o accessToken do
próximo test (sintoma: 401 em rotas autenticadas no spec seguinte).

**Único bug de produção descoberto nesta varredura**: #4 (AuditLog FK
race no handler async fire-and-forget).

**Bug menor descoberto e corrigido**: o `prisma-error.mapper` lia
apenas `meta.target` (válido só pra P2002). P2003 e P2025 deixavam
o cliente sem `target`/`field_name` para debuggar. Corrigido em
`src/shared-kernel/http/prisma-error.mapper.ts:22-36` —
agora lê `target ?? field_name ?? constraint ?? cause`.
