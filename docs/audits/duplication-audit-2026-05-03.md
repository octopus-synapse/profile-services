# Auditoria de Duplicação Conceitual — profile-services

**Data:** 2026-05-03
**Escopo:** `src/`, `test/`, `packages/` (excluídos: `generated/`, `dist/`, `prisma/migrations/`, `node_modules/`, `.claude/worktrees/`, SDK auto-gerado)
**Método:** 5 agents Explore em paralelo, cada um cobrindo um eixo distinto.

## Categorias usadas

| Tag | Significado |
|---|---|
| `DRY-SEMANTIC` | Mesmo conceito implementado em 2+ lugares com código diferente |
| `DS-VIOLATION` | Divergência de uma convenção estabelecida (envelope, status, etc) |
| `MISSING-ABSTRACTION` | Padrão repetido 3+ vezes que deveria ser extraído |
| `ACCIDENTAL-DIVERGENCE` | Lugares que começaram idênticos e divergiram (copy-paste modificado) |
| `INCONSISTENT-ABSTRACTION` | Abstração base existe mas alguns módulos a ignoram |
| `MISSING-SHARED-COMPONENT` | Util/middleware/guard que deveria existir e não existe |
| `LEGACY-DEBT` *(novo)* | Código vivo que sobrou de migração anterior |
| `DOCUMENTATION-GAP` *(novo)* | Falta de doc que causa confusão estrutural |
| `IMPLICIT-COUPLING` *(novo)* | Acoplamento implícito a convenções não documentadas |
| `TESTING-STRATEGY-DIVERGENCE` *(novo)* | Camadas de teste com estratégias diferentes sem doc |

**Severidade:** `[HIGH]` (divergência ativa / 5+ duplicações / risco de bug) · `[MEDIUM]` (3-4 duplicações / drift) · `[LOW]` (cosmético / 2 duplicações).

---

## Resumo executivo

| Eixo | HIGH | MEDIUM | LOW | Total |
|---|---:|---:|---:|---:|
| Cross-cutting (errors/HTTP/auth) | 2 | 6 | 3 | 11 |
| Observability (logger/audit/cache/jobs/lifecycle) | 4 | 7 | 2 | 13 |
| DTOs/validation/schemas/mappers | 5 | 6 | 2 | 13 |
| Data access (pagination/repos/queries) | 3 | 8 | 2 | 13 |
| Tests/scripts/packages | 1 | 7 | 4 | 12 |
| **Total** | **15** | **34** | **13** | **62** |

**Top 5 dores transversais (afetam 5+ BCs):**

1. **Pagination response com 3 envelopes diferentes** (`{items}` canônico vs `{data}` legacy vs `{items, pagination:{}}` vs cursor-based)
2. **`USER_SELECT` projection** definida em 7+ repositórios (`{id, name, username, photoURL}`)
3. **7 utilitários diferentes pra parsear `?limit=`** (`parsePositiveInt`, `parseLimitOrThrow`, `parseLimitLoose`, `parseLimit`, `clampLimit`, `parsePage`, `num()` inline)
4. **50+ definições inline de `IdParam` / `UserIdParam` / `ResumeIdParam`** ao invés de reutilizar shared-kernel
5. **Cache TTL constants** dispersas em 7+ arquivos com unidades misturadas (segundos vs ms)

---

## 1. Cross-cutting (afeta múltiplos BCs)

### 1.1 Pagination response envelopes
**[HIGH] [ACCIDENTAL-DIVERGENCE]** — 3 shapes coexistindo:
- **Canônico:** `src/shared-kernel/schemas/common/api.types.ts:49-68` → `{items, total, page, limit, totalPages, hasNext, hasPrev}`
- **Legacy `data`:** `src/bounded-contexts/social/follow.routes.schemas.ts:60-64`, `connection.routes.schemas.ts:78-92`, `activity.routes.schemas.ts`, `jobs/jobs.routes.schemas.ts:LegacyPaginatedSchema` (sem `hasNext`/`hasPrev`)
- **`{items, pagination:{}}`:** `src/bounded-contexts/jobs/dto/job.schema.ts:93-96`
- **Cursor:** `src/bounded-contexts/feed/feed.routes.schemas.ts:FeedTimelineResponseSchema` (legítimo, mas sem tipo compartilhado)

O comentário em `connection.routes.schemas.ts:71-76` admite divergência: "Distinct from the canonical...because the service hasn't been migrated yet."

→ **Fix:** Migrar todos pra `PaginatedResponse<T>`. Fixar cursor numa `CursorPaginatedResponse<T>` shared.

### 1.2 Pagination param parsing
**[HIGH] [MISSING-ABSTRACTION]** — 7 utilitários divergentes:
- `src/bounded-contexts/resumes/core/resumes.routes.schemas.ts:parsePositiveInt` (retorna fallback)
- `src/bounded-contexts/integration/mec-sync/mec-sync.routes.schemas.ts:parseLimitOrThrow` (joga `ValidationException`)
- `src/bounded-contexts/integration/mec-sync/mec-sync.routes.schemas.ts:parseLimitLoose` (retorna `NaN` — BUG-035)
- `src/bounded-contexts/skills-catalog/tech-skills/tech-skills.routes.schemas.ts:parseLimit`
- `src/bounded-contexts/skills-catalog/spoken-languages/spoken-languages.routes.ts:parseLimit`
- `src/bounded-contexts/collaboration/admin/admin-collaboration.routes.schemas.ts:parsePage`
- `src/bounded-contexts/feed/feed.routes.schemas.ts:clampLimit` (sem lower bound)
- `src/bounded-contexts/social/{follow,connection,activity}.routes.schemas.ts:num()` — copy-paste idêntico em 3 arquivos

→ **Fix:** `src/shared-kernel/http/query-parsers.ts` com `parsePageQuery(q, defaults)` canônico.

### 1.3 Default page size constants
**[MEDIUM] [ACCIDENTAL-DIVERGENCE]** — Cada BC escolhe próprio default:
- shared-kernel: `DEFAULT_PAGE_SIZE = 20`
- platform/common: `DEFAULT_PAGE_SIZE = 20` (duplicata)
- resumes: `50` (`resumes.routes.ts:71`)
- jobs: `20`
- success-stories: `12` (`DEFAULT_LIMIT`)
- notifications: `20`
- feed: `20` (max 50)
- collaboration/chat: `20` ou `50` dependendo do schema

### 1.4 Max page size cap
**[MEDIUM] [DRY-SEMANTIC]** — Caps inline divergem:
- `PaginationQuerySchema`: `.max(100)`
- jobs: `Math.min(..., 100)`
- feed: `Math.min(..., 50)` (cap diferente)
- chat: alguns `.max(50)`, outros `.max(100)`
- social: `Math.min(..., 100)` espalhado

### 1.5 IdParam schemas inline (50+ ocorrências)
**[MEDIUM] [MISSING-SHARED-COMPONENT]** — Cada BC redefine `z.object({ id: z.string() })`, `z.object({ userId: z.string() })` etc. shared-kernel já tem `IdParamSchema` mas é amplamente ignorado. Amostra: `social/follow.routes.schemas.ts:22`, `social/connection.routes.schemas.ts:17-18`, `analytics/share-analytics/share-analytics.routes.schemas.ts`, `resumes/core/resumes.routes.schemas.ts`, e 22+ outros.

→ **Fix:** Factory `createIdParam(name)` ou expor `IdParamSchema`/`UserIdParamSchema`/`ResumeIdParamSchema`/`SlugParamSchema` em shared-kernel.

### 1.6 USER projections em repositórios
**[HIGH] [DRY-SEMANTIC]** — `{id, name, username, photoURL}` definido em 7 lugares:
- `src/bounded-contexts/social/infrastructure/adapters/persistence/follow.repository.ts:1` (`USER_SELECT`)
- `social/.../activity.repository.ts:1` (idem)
- `social/.../connection.repository.ts:1` (idem)
- `social/services/skill-endorsement.service.ts:1` (idem)
- `jobs/.../prisma-jobs.repository.ts:29` (`AUTHOR_SELECT`)
- `feed/.../prisma-feed.repository.ts:23` (`AUTHOR_SELECT`)
- `feed/.../prisma-comment.repository.ts:1` (idem)

→ **Fix:** `src/shared-kernel/persistence/user-projections.ts` com `USER_SUMMARY_SELECT`, `USER_WITH_BIO_SELECT`.

### 1.7 ISO datetime validators inline (20+ ocorrências)
**[MEDIUM] [MISSING-SHARED-COMPONENT]** — `z.string().datetime()` repetido em todos os route schemas. Existe `DateStringSchema` mas só pra `YYYY-MM(-DD)`. Não há `IsoDateTimeSchema` canônico.

→ **Fix:** `src/shared-kernel/schemas/primitives/datetime.schema.ts` com `IsoDateTimeSchema` e `DateOnlySchema`.

### 1.8 SUCESS message envelope `{ message: '...' }`
**[LOW] [MISSING-ABSTRACTION]** — 10+ rotas DELETE/UPDATE retornam `{ message: 'X deleted successfully' }` com texto improvisado. Sem schema compartilhado. Amostra: `identity/users/users.routes.ts`, `resumes/core/resumes.routes.ts`.

→ **Fix:** `SuccessMessageSchema` shared, ou usar HTTP 204.

### 1.9 Mapper naming convention
**[MEDIUM] [INCONSISTENT-ABSTRACTION]** — 4+ convenções coexistindo:
- `toResponseDto(entity)` — `resumes/section-types/application/to-response-dto.ts`
- `mapMessageToResponse(entity)`, `mapConversationToResponse(entity)` — `collaboration/chat/application/mappers/chat.mapper.ts`
- `presentQualitySnapshot(entity)` — `resume-quality`
- `mapToDto`, `serialize`, `present` — diversos

→ **Fix:** Padronizar uma convenção (ex.: `toResponseDto`) e documentar.

### 1.10 Repository method naming
**[MEDIUM] [INCONSISTENT-ABSTRACTION]** — Sem padrão:
- Maioria: `findById()`
- Alguns: `findJobByIdAndUserId()`, `findByIdAndUserId()`
- Listas: `findAllUserResumesUseCase.execute()` vs `listJobs()` vs `listFeedPosts()`
- Criação: `createApplication()` vs `createJob()`

### 1.11 ID validation cuid vs uuid
**[MEDIUM] [ACCIDENTAL-DIVERGENCE]** — Mistura nas validations:
- `social/schemas/social.schema.ts`: `z.string().cuid()`
- `identity/account-lifecycle/.../accept-consent.schema.ts`: `z.string().uuid()`
- `analytics/schemas/analytics.schema.ts`: `z.string().cuid()`

→ **Investigar:** confirmar Prisma schema; se tudo é `cuid`, padronizar globalmente.

---

## 2. Shared Kernel

### 2.1 `src/shared-kernel/exceptions/`
- **[HIGH] [INCONSISTENT-ABSTRACTION]** — `getResponse()` em 4 exceptions é dead code, nunca chamado pelo `error.mapper.ts`:
  - `bounded-contexts/fit-profile/domain/exceptions/fit-profile.exceptions.ts:36-43`
  - `bounded-contexts/job-match/domain/exceptions/job-match.exceptions.ts:42-49`
  - `bounded-contexts/resume-quality/domain/exceptions/resume-quality.exceptions.ts:34-41`
  - `bounded-contexts/onboarding/domain/exceptions/onboarding.exceptions.ts:33-41`
  
- **[MEDIUM] [DRY-SEMANTIC]** — `EntityNotFoundException` (shared) duplicada por:
  - `bounded-contexts/resumes/domain/exceptions/resume-not-found.exception.ts:6-12`
  - `bounded-contexts/import/domain/exceptions/import.exceptions.ts:13-19`

- **[MEDIUM] [ACCIDENTAL-DIVERGENCE]** — `LimitExceededException.statusHint = 422` mas docstring diz "Maps to HTTP 429". `RateLimitedException` herda o bug. `src/shared-kernel/exceptions/domain.exceptions.ts:143-155`

- **[MEDIUM] [MISSING-ABSTRACTION]** — `AuthenticatedUserMissingException` redefinida em 3 BCs (fit-profile, job-match, resume-quality) com semântica idêntica à shared `AuthenticationRequiredException`.

- **[MEDIUM] [MISSING-SHARED-COMPONENT]** — Falta `MissingTranslationException` shared; `error.mapper.ts:83-97` faz inline.

### 2.2 `src/shared-kernel/http/`
- **[HIGH] [INCONSISTENT-ABSTRACTION]** — Documentação de `route.types.ts:43-45` diz "default 201 for POST" mas `elysia-route-mounter.ts:162-166` não implementa: POST sem `statusCode` explícito retorna 200.

- **[MEDIUM] [DS-VIOLATION]** — Handler em `bounded-contexts/onboarding/onboarding.routes.ts:396` retorna `{ success: false, message: 'Step not found' }` ao invés de jogar exception.

- **[LOW] [DRY-SEMANTIC]** — Endpoint de session em `identity/authentication/authentication.routes.ts:204` retorna `{ authenticated, user }` em vez de só `user`.

### 2.3 `src/shared-kernel/logger/`
- **[HIGH] [DRY-SEMANTIC]** — Logger duplo: `LoggerPort` (canônico) vs `AppLoggerService` (concreto Winston). Existência de 5 scripts de migração (`inject-logger-port.ts`, `migrate-legacy-logger.ts`, `list-logger-gaps.ts`, `thread-logger-compositions.ts`, `fix-spec-loggers.ts`) confirma drift contínuo.
  - `bounded-contexts/platform/common/cache/services/cache-warming.service.ts:11` ainda injeta `AppLoggerService` direto.

- **[MEDIUM] [INCONSISTENT-ABSTRACTION]** — Assinatura de `error()` divergente:
  - Port: `error(message, trace?, context?, meta?)`
  - Implementação: também aceita `errorWithMeta(message, meta)` (linha 99-100)
  - Calls misturam ambas no codebase.

- **[MEDIUM] [ACCIDENTAL-DIVERGENCE]** — `console.*` direto em:
  - `bounded-contexts/identity/authorization/seeds/seed.runner.ts` (10 chamadas)
  - `bounded-contexts/translation/application/compositions/translation.composition.ts:206-209` (passa `console` como logger)
  - `bounded-contexts/platform/common/logger/logger.service.ts:17` (fallback)

### 2.4 `src/shared-kernel/auth/` + `authorization/`
- **[MEDIUM] [MISSING-ABSTRACTION]** — `requireCurrentFitProfile` em `bounded-contexts/fit-profile/application/guards/fit-profile.guards.ts:43-50` duplicado conceitualmente em `bounded-contexts/job-match/domain/exceptions/job-match.exceptions.ts:32-40`.

- **[LOW] [INCONSISTENT-ABSTRACTION]** — Ownership exceptions per-BC (jobs: `NotJobOwnerException`, resumes: `ResumeNotOwnedException`, social: `NotPartOfConnectionException`) coexistem com shared `OwnershipAccessDeniedException`. Aceitável (nomes domain-specific ajudam i18n) mas não há policy doc.

### 2.5 `src/shared-kernel/viewer-context/`
- **[LOW] [MISSING-SHARED-COMPONENT]** — Tipo `WithViewer<T>` definido em `viewer-context.types.ts:12-15` mas uso esparso (só evidência clara em `social/follow.service.ts:enrichWithViewerRelationship`). Sem decorator/middleware pra injetar viewer declarativamente.

### 2.6 `src/shared-kernel/validation/` + `schemas/`
- **[HIGH] [ACCIDENTAL-DIVERGENCE]** — `EmailSchema` definida 2 vezes no shared-kernel com regras diferentes:
  - `src/shared-kernel/schemas/validation.schemas.ts:24` → `min(3)`
  - `src/shared-kernel/schemas/primitives/email.schema.ts:14` → `min(5)`

- **[HIGH] [MISSING-ABSTRACTION]** — `SUPPORTED_LOCALES` em 3 lugares com divergência:
  - `src/shared-kernel/constants/locale.constants.ts:5` → `['en', 'pt-BR', 'es']`
  - `src/shared-kernel/utils/locale-resolver.types.ts:11` → `['en', 'pt-BR', 'es']`
  - `src/bounded-contexts/platform/i18n/domain/translation.port.ts:15` → `['pt-BR', 'en']` (**SEM 'es'**, ordem diferente)

### 2.7 `src/shared-kernel/persistence/` + `database/`
- **[MEDIUM] [INCONSISTENT-ABSTRACTION]** — Padrão de transação varia:
  - Callback: `await this.prisma.$transaction(async (tx) => {...})` (feature-flags)
  - Array: `await this.prisma.$transaction([...])` (role.repository)
  - Custom wrapper: `runInTransaction()` em `bounded-contexts/resumes/core/services/generic-resume-sections/repository/generic-resume-sections.repository.ts:16-28`

- **[MEDIUM] [MISSING-ABSTRACTION]** — Tipagem de `PrismaLikeClient = PrismaService | Prisma.TransactionClient` definida só em `bounded-contexts/resumes/core/.../generic-resume-sections.repository.ts:6`. Outros repositórios assumem `PrismaService` direto.

- **[LOW] [MISSING-ABSTRACTION]** — Sem retry/timeout wrapper pra `$transaction`.

### 2.8 `src/shared-kernel/cache/`
- **[HIGH] [ACCIDENTAL-DIVERGENCE]** — TTL constants espalhadas, unidades misturadas:
  - `bounded-contexts/platform/common/constants/validation/pagination.const.ts:18-23` → `CACHE_TTL.{SHORT:60, MEDIUM:300, LONG:3600, DAY:86400}`
  - `bounded-contexts/platform/common/cache/services/cache-warming.service.ts:24-28` → `CACHE_TTL.{POPULAR_RESUME:3600, PUBLIC_RESUME:300, USER_PROFILE:120}`
  - `bounded-contexts/integration/mec-sync/domain/entities/mec-row.ts` → `MEC_CACHE_TTL`
  - `bounded-contexts/skills-catalog/tech-skills/interfaces/cache.config.ts:16-24` → `TECH_SKILLS_CACHE_TTL`
  - `bounded-contexts/identity/authorization/.../authorization.service.ts` → `DEFAULT_CACHE_TTL_SECONDS=60`
  - `bounded-contexts/platform/feature-flags/.../redis-flag-cache.service.ts` → `TTL_SECONDS=60`
  - `bounded-contexts/platform/common/.../get-admin-alerts.use-case.ts` → `CACHE_TTL_MS=30_000` (**ms!**)

- **[MEDIUM] [INCONSISTENT-ABSTRACTION]** — `CacheInvalidationService` existe mas raramente usado. Maioria dos handlers chama `cache.delete()` direto.

### 2.9 `src/shared-kernel/event-bus/`
- **[MEDIUM] [MISSING-ABSTRACTION]** — Event bus duplo:
  - `EventPublisher` (canônico, class-based, `EventClass.TYPE`)
  - `SocialEventBusPort` (BC-local, string-based, ex: `feed:user:${id}`)
  - `bounded-contexts/social/activity.composition.ts:20-22` injeta os dois.

- **[LOW] [DRY-SEMANTIC]** — Pattern `eventBus.on(EventClass.TYPE, handler.handle.bind(handler))` repetido ~12x sem helper compartilhado.

### 2.10 `src/shared-kernel/lifecycle/`
- **[MEDIUM] [MISSING-ABSTRACTION]** — Cada composition cria `Lifecycle[]` inline com `init: async () => { register...() }`. Padrão idêntico em realtime, social, platform/metrics, feature-flags, etc. Sem helper `initLifecycle(name, fn, logger)`.

- **[MEDIUM] [INCONSISTENT-ABSTRACTION]** — `dispose?()` raramente implementado. Sem orquestração de shutdown documentada (ordem, timeout, error handling).

### 2.11 `src/shared-kernel/jobs/`
- **[MEDIUM] [INCONSISTENT-ABSTRACTION]** — Workers tratam erro de jeitos diferentes:
  - `bounded-contexts/automation/workers/auto-apply.worker.ts:45-51` → loga + rethrow (BullMQ retry)
  - `bounded-contexts/social/services/skill-decay.worker.ts:19-33` → loga + continue (cron não sabe)
  - `JobProcessor<T>` é `(job) => Promise<void>` sem hint de error type.

- **[MEDIUM] [MISSING-SHARED-COMPONENT]** — Distributed lock semantics divergem entre `CachePort.acquireLock()` e `IdempotencyService` (que usa cache lock por baixo). Sem `DistributedLockPort` shared.

### 2.12 `src/shared-kernel/websocket/`
- **[LOW] [MISSING-ABSTRACTION]** — `WsMessageHandler<TPayload = unknown>` sem schema validation. Handlers castam payload manualmente. Sem registry de schema.

### 2.13 `src/shared-kernel/utils/` + `enums/`
- **[MEDIUM] [MISSING-SHARED-COMPONENT]** — `toUTCDate` em `bounded-contexts/platform/common/utils/date.utils.ts:11-29` duplica regex de `DateStringSchema`.

- **[LOW] [MISSING-SHARED-COMPONENT]** — Policy de quando mover enum pra shared-kernel não documentada. Platform enums centralizados ✓ mas domain enums (status, activity types) espalhados.

---

## 3. Bounded Contexts (issues localizadas)

### 3.1 `bounded-contexts/social/`
- **[HIGH] [DRY-SEMANTIC]** — `PageQuery`, `num()`, `paginate()` definidos 3x:
  - `follow.routes.schemas.ts:23-38` (default limit 10)
  - `connection.routes.schemas.ts:19-38`
  - `activity.routes.schemas.ts:35-50` (default limit 20 — **divergente**)

- **[HIGH] [DRY-SEMANTIC]** — `USER_SELECT` em 4 arquivos da mesma BC (ver 1.6).

### 3.2 `bounded-contexts/jobs/`
- **[MEDIUM] [MISSING-SHARED-COMPONENT]** — `JobTypeEnum`, `RemotePolicyEnum`, `PaymentCurrencyEnum` definidos 2x:
  - `jobs.routes.schemas.ts:92-100` → `z.enum([...])` literal
  - `dto/job.schema.ts:7-10` → `z.nativeEnum(JobType)` (Prisma)

- **[MEDIUM] [ACCIDENTAL-DIVERGENCE]** — Endpoints da mesma BC misturam `PaginatedResponseSchema` e `LegacyPaginatedSchema`.

### 3.3 `bounded-contexts/resumes/`
- **[HIGH] [DRY-SEMANTIC]** — Resume includes duplicados com filtros divergentes:
  - `resumes/core/resumes.repository.ts:10-23` — sem filtro `isVisible`
  - `dsl/infrastructure/queries/resume-query.ts:RESUME_RELATIONS_INCLUDE` — com `where: { isVisible: true }`

### 3.4 `bounded-contexts/import/`
- **[HIGH] [MISSING-SHARED-COMPONENT]** — `ImportStatusEnumSchema` literal idêntico em 2 lugares:
  - `import.routes.schemas.ts:40-49`
  - `infrastructure/dto/import-result.schema.ts:3-12`

### 3.5 `bounded-contexts/resume-quality/`
- **[MEDIUM] [MISSING-ABSTRACTION]** — Schemas inline em `resume-quality.routes.ts:14-43` (`ResumeIdParams`, `QualityIssueContextSchema`, `QualityIssueSchema`, `ResumeQualityResponseSchema`) — não foi pego pelo batch 2 de extração.

### 3.6 `bounded-contexts/feed/`
- **[MEDIUM] [INCONSISTENT-ABSTRACTION]** — Único BC com cursor pagination, mas tipo cursor não está em shared-kernel.

- **[MEDIUM] [INCONSISTENT-ABSTRACTION]** — Soft-delete via Prisma extension cobre só `Message`, `Post`, `PostComment` (`bounded-contexts/platform/prisma/soft-delete.ts`). Outras BCs hard-deletam — semântica de retenção inconsistente.

### 3.7 `bounded-contexts/onboarding/`
- **[MEDIUM] [DS-VIOLATION]** — `onboarding.routes.ts:396` retorna `{ success: false, message }` em vez de exception (ver 2.2).

### 3.8 `bounded-contexts/identity/`
- **[MEDIUM] [MISSING-ABSTRACTION]** — `account-lifecycle/domain/ports/audit-logger.port.ts` define seu próprio `AuditLoggerPort` com enum fechado. Authorization BC tem `AuditLogPort` local em `apply-access-modifier.use-case.ts` (string-based). Platform tem `AuditLogService` concreto. **Três contratos diferentes pra audit.**

- **[LOW] [DRY-SEMANTIC]** — `bounded-contexts/identity/authorization/infrastructure/adapters/audit-log.adapter.ts:38-42` sempre usa `.log()` (lenient), nunca `.logStrict()` — mascara falhas de audit.

### 3.9 `bounded-contexts/platform/`
- **[MEDIUM] [DRY-SEMANTIC]** — `audit-log.service.ts` oferece `log()` (lenient) e `logStrict()` (strict) — escolha não documentada nos call sites.

- **[HIGH] [INCONSISTENT-ABSTRACTION]** — `cache-warming.service.ts:11` injeta `AppLoggerService` direto, fora do padrão LoggerPort.

### 3.10 `bounded-contexts/translation/`
- **[HIGH] [DOCUMENTATION-GAP / IMPLICIT-COUPLING]** — `translation.composition.ts:206-209` passa objeto `{log, debug, warn, error}` apontando pra `console.*` em vez de `LoggerPort`. Logs estruturados invisíveis pra agregadores.

### 3.11 `bounded-contexts/fit-profile/` + `job-match/`
- **[MEDIUM] [MISSING-ABSTRACTION]** — Guard de "fit profile required" duplicado entre as 2 BCs (ver 2.4).

### 3.12 `bounded-contexts/resumes/section-types/`
- **[MEDIUM] [MISSING-ABSTRACTION]** — `SectionTypeTranslationsSchema` em `dto/section-type.schema.ts:96-108` valida que todas as locales presentes — pattern útil mas não compartilhado. `packages/i18n` tem `LocalizedDictionary<K>` mas é genérico tipo, não validator Zod.

→ **Fix:** `createLocalizedSchema(innerSchema, locales)` helper em shared-kernel.

---

## 4. Tests

### 4.1 Fixtures
- **[MEDIUM] [ACCIDENTAL-DIVERGENCE]** — Dois `AuthHelper`:
  - `test/infrastructure/e2e/helpers/auth.helper.ts:21-158` — opcional skip de email-verify/onboarding
  - `test/infrastructure/shared/auth.helper.ts:27-113` — sempre verifica/onboarda, com `.bearer()`
  
- **[MEDIUM] [MISSING-ABSTRACTION]** — 4 convenções de naming pra factories:
  - `createMock*` (puro) — `test/shared/factories/user.factory.ts:61-68`
  - `createTest*` + `unique*` — `test/infrastructure/{e2e,integration}/...`
  - `fresh*` — `test/infrastructure/shared/fresh-context.ts`

### 4.2 Test infrastructure setup
- **[MEDIUM] [DRY-SEMANTIC]** — Cache lifecycle de `TestApp` duplicado:
  - `test/infrastructure/integration/setup.ts:29-91`
  - `test/infrastructure/e2e/setup.ts:29-52`
  
  Mesmo padrão `cachedAppRef`, rebuild de helpers em mudança de ref.

### 4.3 Mocks/stubs
- **[LOW] [MISSING-ABSTRACTION]** — Mocks de `EventPublisherPort` e in-memory repos reconstruídos em vários `*.spec.ts`:
  - `bounded-contexts/social/services/follow.service.spec.ts:33-41`
  - `bounded-contexts/resumes/core/resumes.service.spec.ts:41-46`

### 4.4 Static-analysis
- **[LOW] [MISSING-ABSTRACTION]** — Discovery logic duplicado nos 3 parity tests do i18n:
  - `i18n-catalog-parity.architecture.spec.ts:64-82`
  - `i18n-enum-parity.architecture.spec.ts:20-41`
  - `i18n-notification-parity.architecture.spec.ts`

- **[LOW] [MISSING-ABSTRACTION]** — `architecture/clean-architecture/rule-runner.ts:1-18` não expõe utilitários de file walk / AST extraction; cada rule reinventa.

### 4.5 Legacy
- **[MEDIUM] [LEGACY-DEBT]** — `test/shared/http-test-client.ts` é dead code (relicto do Nest Phase-2; zero imports em specs ativos).

---

## 5. Scripts

### 5.1 Logger migration (5 scripts com lógica AST sobreposta)
**[HIGH] [DRY-SEMANTIC]** — `findMatchingParen()`, `splitTopLevel()`, file walking, import injection duplicados:
- `scripts/fix-spec-loggers.ts:1-233`
- `scripts/fix-test-modules-logger.ts:1-109`
- `scripts/migrate-legacy-logger.ts:1-200+`
- `scripts/inject-logger-port.ts:1-200+`
- `scripts/thread-logger-compositions.ts:1-200+`

→ **Fix:** Extrair `scripts/lib/ast-helpers.ts` com `findMatchingParen`, `splitTopLevel`, `injectImport`, `walkSourceFiles`.

### 5.2 File walker reimplementado em 6 lugares
**[MEDIUM] [DRY-SEMANTIC]**:
- `scripts/extract-error-codes.ts:13-22` (`listFiles`)
- `scripts/extract-prisma-enums.ts:1-29`
- `scripts/list-logger-gaps.ts:9-26` (`walk`)
- `scripts/inject-logger-port.ts:38-55` (`walk`)
- `scripts/migrate-legacy-logger.ts:41-58` (`walk`)
- `test/static-analysis/architecture/i18n-catalog-parity.architecture.spec.ts:38-47` (`listSourceFiles`)

Filtros divergem (`testing` vs `__tests__` vs ambos).

### 5.3 CI runners bash
**[MEDIUM] [DRY-SEMANTIC]**:
- `scripts/run-e2e.sh` ↔ `scripts/run-integration.sh` — ~95% idênticos (linhas 1-250)
- `scripts/run-e2e-ci.sh` ↔ `scripts/run-integration-ci.sh` — sharding round-robin idêntico

→ **Fix:** `scripts/lib/container-orchestration.sh` + `scripts/lib/test-sharding.sh`.

### 5.4 Underscore-prefix
**[LOW] [DOCUMENTATION-GAP]** — Relação entre `_e2e-preseed.ts`, `_swagger-diag.ts`, `_walk-bc-deps.ts` e scripts principais não documentada. `_swagger-diag.ts` ainda importa `AppModule` (legacy Nest, possivelmente deletado em Phase-2).

### 5.5 Acoplamento implícito
**[MEDIUM] [IMPLICIT-COUPLING]** — Scripts de logger migration assumem padrões de naming (`build*UseCases`, `*.use-case.ts`, `*.composition.ts`); se mudarem, scripts skipam silenciosamente.

---

## 6. Packages

### 6.1 `packages/i18n/`
- **[LOW] [MISSING-ABSTRACTION]** — 3 dicionários (`ERROR_DICTIONARY`, `ENUM_DICTIONARY`, `NOTIFICATION_DICTIONARY`) com 3 parity tests independentes que duplicam discovery logic. Ver 4.4.

---

## 7. Surprises / categorias novas

### 7.1 `LEGACY-DEBT`
- `test/shared/http-test-client.ts` (Nest Phase-2 leftover, dead code).
- Possivelmente `_swagger-diag.ts` (importa AppModule possivelmente removido).

### 7.2 `DOCUMENTATION-GAP`
- Sem `test/README.md` ou `test/infrastructure/README.md` explicando 3 layers (unit/integration/e2e), quando usar `freshUser()` vs `createMockUser()` vs `AuthHelper.createTestUser()`.
- Sem doc da policy de "quando mover algo pra shared-kernel".
- Sem doc explicando lenient vs strict audit.

### 7.3 `IMPLICIT-COUPLING`
- Scripts de migration acoplados a naming conventions não documentadas.
- `cache.acquireLock()` ↔ `IdempotencyService` ↔ `JobQueue` formam cadeia de lock implícita; se cache cair, deduplicação de job degrada silenciosamente.

### 7.4 `TESTING-STRATEGY-DIVERGENCE`
- 3 estratégias de pré-seed (legacy integration, e2e pre-seed + skip, architecture sem seed) — cada layer tem necessidade legítima diferente, mas naming sugere incompatibilidade.

### 7.5 Outros
- `translation.composition.ts` passando `console` como logger (falha invisível em logs estruturados).
- Endpoint de session retornando `{ authenticated, user }` em vez de só `user`.

---

## Próximos passos sugeridos (não-vinculantes)

Priorização P0 → P3 baseada em ROI imediato:

**P0 — fix tátil rápido, alto impacto:**
1. Fix `EmailSchema` divergence (3 vs 5 chars min) — 1 LoC
2. Fix `LimitExceededException.statusHint` 422 → 429 — 1 LoC
3. Consolidar `SUPPORTED_LOCALES` (incluir 'es' em platform/i18n) — 1 LoC, mas evita bug de locale faltando
4. Apagar `test/shared/http-test-client.ts` (dead code) — `git rm`
5. Apagar `getResponse()` métodos não usados em 4 exceptions

**P1 — abstração com payback alto:**
6. `src/shared-kernel/persistence/user-projections.ts` (consolida 7 SELECT duplicados)
7. `src/shared-kernel/http/query-parsers.ts` (consolida 7 parseLimit)
8. `src/shared-kernel/cache/cache-ttl.const.ts` (consolida TTLs e padroniza unidade)
9. `src/shared-kernel/schemas/primitives/{datetime,id-params}.schema.ts`
10. Migrar todos paginated responses pro `PaginatedResponse<T>` canônico

**P2 — refactors médios:**
11. Unificar `AuditLogPort` (3 contratos → 1)
12. Padronizar mapper naming (`toResponseDto`)
13. Helper `initLifecycle(name, fn, logger)` + adoption
14. `scripts/lib/{ast-helpers,file-walker,container-orchestration,test-sharding}.{ts,sh}`
15. Auto-201 pra POST no Elysia adapter

**P3 — investigação / docs:**
16. Doc `test/README.md` com 3 layers + estratégias de fixture
17. Doc policy de enum sharing ("3+ BCs = shared-kernel")
18. Investigar uniformidade `cuid` vs `uuid` no Prisma schema
19. Decidir destino do `_swagger-diag.ts` (live ou legacy?)
20. Definir `DistributedLockPort` shared (cache + jobs + idempotency)

---

## Apêndice — execução (atualizada 2026-05-04)

Todas as 75 decisões do plano foram aplicadas em ~50 commits na branch
`refactor/backend`. Ver `/home/enzoferracini/.claude/plans/glittery-whistling-simon.md`
para o catálogo completo das decisões e `git log refactor/backend ^main`
para o histórico.

Resumo por fase:

| Fase | Status | Itens |
|---|---|---|
| 0 — fixes táticos 1-LoC | ✅ | Q14, Q26, Q12a-d, Q62, Q69, Q18, Q19 |
| 1 — shared-kernel additions | ✅ | Q5, Q6, Q7, Q16, Q22, Q28+Q29, Q31, Q34, Q35, Q40, Q45, Q46, Q55, Q58, Q59, Q17 |
| 2 — sweeps + ports novos | ✅ | Q1+Q2+Q42+Q44+Q48 (pagination), Q3+Q4 (page defaults), Q9 (mappers), Q10 (repos), Q17 (auto-201), Q20+Q53+Q54 (logger), Q21 (logger.error sig), Q23 (fit-profile guard), Q33 (event bus), Q43 (jobs enums), Q47 (resume-quality schemas), Q50+Q51+Q52 (audit), Q60 (dictionary discovery), Q56+Q57 (test fixtures) |
| 3 — políticas estruturais | ✅ | Q8 (success interceptor), Q27 (drop 'es'), Q32 (cache invalidation port + lint), Q36 (OnShutdown), Q37 (WorkerFailureMode), Q38 (DistributedLock), Q39 (WsMessageSchema), Q49 (soft-delete updateMany guard), Q11 (UUID v7 phase 1: extension migration), Q63 (apaga 5 logger scripts), Q64 (walk-source lib), Q65 (test-orchestration.sh) |
| 4 — docs + governance | ✅ | Q41+Q67 (CLAUDE.md), Q66 (scripts/README.md), Q70+Q71 (test/README.md), Q24 (ownership policy doc), apêndice neste audit |

Notas:

- Q11 fase 2 (swap de defaults `cuid → uuidv7` + backfill) ficou
  documentada em `prisma/migrations/README.md` — a migration de
  install do extension está aplicada, a swap precisa de janela de
  deploy coordenada.
- Q32 lint roda em modo `warn` por default; o sweep dos 4 call sites
  remanescentes (`mec-sync redis-cache`, `job-match recompute worker`,
  `tech-skills-sync`, `chat-cache`) habilita `CACHE_LINT_MODE=error`
  no precommit.
- Q57 + Q9 atingiram cobertura total (todos os call sites migrados).
