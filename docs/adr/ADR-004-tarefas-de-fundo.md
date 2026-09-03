# ADR-004: Tarefas de fundo — quem declara uma fila tem um consumidor

## Status

**Aceito** — 2026-09-03

## Contexto

Três bounded contexts (`resume-quality`, `job-match`, `notifications`)
devolviam `workers: ReadonlyArray<BcWorkerBinding>` confiando num laço do
bootstrap que **não existia**: só `CACHE_INVALIDATION_QUEUE` era registrada,
inline. `registerAutomationJobs`, `registerFitProfileJobs` e
`registerNotificationsJobs` nunca eram chamadas; `jobMatch.lifecycles` não
entrava na lista drenada.

Em produção (`ENABLE_BULLMQ=true` é obrigatório), isso significava trabalho
**gravado no Redis e nunca executado**: recompute de qualidade por IA a cada
edição, invalidação de cache de match, recomendações diárias, lembrete de
expiração de fit. Sem teste, nada acusava.

## Decisão

1. **Um laço, no bootstrap.** `register-bc-workers.ts` percorre `workers` de
   toda composição e chama `queue.register(binding.queue, binding.process)`.
   Registro inline de worker em BC é proibido — o padrão é declarar.
2. **`enabledWhen?: FlagKey`.** Um binding pode ficar inerte atrás de uma
   feature flag (a automação de candidatura vive atrás de
   `automation.enabled`, desligada por padrão). "Desligado por flag" é
   intencional e documentado no próprio binding.
3. **Workers no mesmo processo da API.** Não há segundo deployable; o custo de
   um processo separado não se paga hoje. Se um dia pagar, o laço é o único
   lugar a mudar.
4. **O teste que prova.** `queue-consumers.architecture.spec.ts` sobe o
   bootstrap, coleta toda fila com produtor (`enqueue`) e toda fila com
   consumidor (`register`), e **reprova na diferença** — aceitando as
   desligadas por flag. Roda no pre-commit e no CI (`test:static`).
5. **`lifecycles` de todo BC entram na lista drenada** no shutdown.

## Consequências

- Uma fila nova sem worker não passa do pre-commit.
- Reverter a falha antiga foi o teste do teste: com o laço removido, a spec
  reprova.
- O alarme do Datadog que vigiava um container inexistente
  (`profile-libretranslate`) saiu; entraram saúde do provedor de tradução,
  fila com itens parados e gasto de IA por dia (`docs/observability/datadog.md`).
