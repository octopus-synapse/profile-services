# Tech Debt Cleanup Plan — profile-services

Zerar o tech debt deixado pelo sweep de testes + os offenders pré-existentes de
baseline. Decisões do usuário: **tipar TODOS os 82 casts** `as unknown as`, e
**dividir os 3 arquivos** do file-size baseline. Disciplina: corrigir a raiz,
rebaselinar só o que ficar genuinamente correto, rodar a bateria a cada fase.

Estado inicial: bateria 100% verde (unit 3062, static 293, security 131,
integration 642, e2e 404, biome 0, precommit 0). Não regredir.

---

## Fase A — `no-unknown-cast`: tipar os 82 (baseline 82 → 0)

Categorias (medidas):
- **5** fronteira `Schema as unknown as Route<T>['query'|'body']`.
- **11** `ctx.query|body|params as unknown as XDto` (handlers).
- **66** restantes: repositórios Prisma (JSON columns ↔ domínio), composition,
  adapters, handlers register, websocket.

Passos:
1. **Raiz do tipo Route** (`shared-kernel/http/route.ts:146-148`): trocar
   `ZodSchema<unknown>` → `ZodTypeAny` em `body/query/params/response`. Remove os
   5 casts de schema sem afetar runtime. Validar typecheck.
2. **ctx casts** (11): `ctx.query` etc. são `unknown` → o `as unknown as X` é
   redundante; trocar por `as X` direto (1 assertion). Onde o handler já recebe
   o tipo via genérico, remover o cast.
3. **Repositórios Prisma (66)**: introduzir helpers de fronteira tipados em vez
   de `as unknown as`:
   - JSON columns: `parseJson<T>(value: Prisma.JsonValue): T` (1 helper em
     `shared-kernel/persistence/`) + um Zod schema por shape onde já existir;
     onde não há schema, um type guard local. Substituir o cast pela chamada.
   - Linhas Prisma → DTO de domínio: usar os mappers/`to<Entity>` existentes;
     onde o cast era `row as unknown as Domain`, mapear campo-a-campo.
   - Casts em composition/register-handlers (event payload): tipar o handler
     pelo `EventClass['payload']` via `registerHandler` genérico.
4. Reduzir o baseline a cada lote: `UPDATE_BASELINE=1 bun run
   scripts/lint-no-unknown-cast.ts` só quando o número real cair; meta final
   **0** (deletar/zerar baseline). Nenhum `// lint-allow` novo salvo fronteira
   de lib externa intratável (documentar caso a caso).
5. Validar: `bun run typecheck` + `bun test src` + specs dos BCs tocados.

Arquivos-foco (maior densidade): `analytics/search/search.routes.ts` (8),
`feed/.../prisma-feed.repository.ts` (6), `bullmq-job-queue.adapter.ts` (5),
`mec-sync/.../prisma-mec-sync-log.repository.ts` (5),
`admin-section-types.routes.ts` (4), `prisma-comment.repository.ts` (4) + cauda.

---

## Fase B — file-size: dividir os 3 (baseline → 0)

Regra: extrair submódulos coesos; manter o arquivo `*.routes.ts` como agregador
que faz spread dos grupos. Schemas continuam em `*.routes.schemas.ts`.

1. **`identity/users/users.routes.ts` (602)** → extrair o grupo admin
   `/v1/users/manage/*` (7 rotas) para `users-admin.routes.ts` +
   `users-admin.routes.schemas.ts`. O `users.routes.ts` re-exporta/concatena.
   Alvo < 500.
2. **`jobs/jobs.routes.ts` (583)** → separar por sub-recurso (ex.: external/saved
   vs core jobs) em `jobs-external.routes.ts`. Alvo < 500.
3. **`infrastructure/elysia-adapter/elysia-pipeline.ts` (551)** → extrair stages
   coesos (ex.: o stage de auth/permission e o de logging/metrics) para
   `pipeline-stages/*.ts`; o pipeline monta a lista. Alvo < 500. (Sinergia com
   Fase C — o stage de logging é onde mora o bug do status.)
4. Após cada split: `bun run typecheck`, biome, e os specs do BC. Atualizar o
   `lint-file-size.baseline.txt` para vazio via `UPDATE_BASELINE=1` só quando
   todos os 3 < 500. Conferir swagger regen (rotas movidas).

---

## Fase C — Log de status (elysia-pipeline cosmético)

Bug: o stage de logging (`elysia-pipeline.ts:238`) lê `ctx.state.responseStatus
?? 200` ANTES de o mounter resolver `route.statusCode` (mounter:197-206), então
loga 200 onde a resposta é 201/204.

Fix de raiz: o mounter passa a stashar o status resolvido em
`ctx.state.responseStatus` ANTES de retornar, para que o stage de logging (que
roda no `finally`, após `next()`) leia o valor final. Alternativa: mover a
emissão do log para o mounter, após `ec.set.status`.
- TDD: teste de unidade no mounter/pipeline afirmando que um POST sem
  `statusCode` loga 201 (não 200) e um DELETE 204 loga 204.
- Cuidado: caminho crítico — não alterar o status REAL da resposta, só o que é
  logado/observado. Rodar integration + e2e após.

---

## Fase D — MinIO no e2e (export 502)

`profile-minio-dev` não está na mesma rede docker do `profile-backend-dev`, então
o upload do PDF dá ECONNREFUSED → export retorna 502 (degradação graciosa, mas
mascara o teste de palette).

Fix: no compose dev (`docker-compose.dev.yml`), anexar o serviço minio à rede do
backend (ou mover para a rede compartilhada) + garantir as envs S3/MinIO no
backend apontando para o hostname do serviço. Validar:
`getent hosts minio` de dentro do backend resolve, e o e2e de export passa SEM o
`502` no conjunto aceito (reverter o `502` tolerado em `export-pipeline.spec.ts`
para `[200,400,500]`).

---

## Fase E — BUG-011 date-handling (rota morta)

`edge-cases.integration.spec.ts` (BUG-011) bate em `POST
/api/v1/resumes/:id/experiences`, rota que **não existe** (legado; as seções
genéricas a substituíram). Hoje passa via skip-on-404.

Fix: repontar os 4 testes de validação de data para a API genérica de seções
(`POST /v1/resumes/:id/sections/work_experience_v1/items` com campos de data),
exercendo a validação real; remover o skip-on-404. Se a intenção do teste já é
coberta por outro spec, remover os testes mortos com nota. Sem `src/**`.

---

## Verificação final (após todas as fases)

```
bun run prisma:generate          # ressincronizar client no host
bun run typecheck
bun test src                     # unit
bun run test:static
bun run test:security
bun run test:integration
bun run test:e2e
bun run lint:fast                # biome
# precommit lint scripts (todos) + arch + contracts
```
Critérios de pronto: tudo verde; `lint-no-unknown-cast.baseline.txt` = 0 e
`lint-file-size.baseline.txt` vazio (ou sem os 3); nenhum bug mascarado por
baseline/allow novo sem justificativa escrita. Commits por fase
(`refactor:`/`fix:`/`test:` + Co-Authored-By).
