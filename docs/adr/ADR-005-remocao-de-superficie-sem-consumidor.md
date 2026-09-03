# ADR-005: Remoção de superfície sem consumidor

## Status

**Aceito** — 2026-09-03

## Contexto

A auditoria de 2026-09 achou **84 % da API sem consumidor**: 380 de 451
endpoints gerados no SDK, 22 de ~60 controllers usados por alguma tela.
Bounded contexts inteiros — feed, social, analytics, integração com GitHub,
badges, grafo de carreira, histórias de sucesso, recrutamento — construídos,
montados e nunca chamados. Cada um custava migrações, dicionários, specs de
paridade, tempo de CI e superfície de ataque.

## Decisão

### Critério

Uma superfície é removida quando, ao mesmo tempo:

1. nenhum arquivo em `apps/client/src` importa o hook/cliente gerado
   (`orphan-hooks-report.spec.ts` lista);
2. nenhum outro BC a consome por porta;
3. o produto declarou que não a quer (decisão do dono, não inferência).

Sem o item 3 a superfície é **listada**, não apagada (ver "Auditoria").

### Como

- **Um commit por grupo**, para que recuperar seja um `git revert`:
  feed `017866ac` · social `d0df423d` · analytics `65212588` ·
  GitHub + shadow + import JSON `5f030556` · badges/grafo/histórias/
  recrutamento `93227b66` · rotas cruas de tradução + `LocaleContent` v1
  `905e2859` · colunas mortas `2a54d12f`.
- Cada commit leva junto: modelos Prisma e migração de drop (enum Postgres
  reconstruído quando um valor sai), chaves órfãs em `packages/i18n`
  (`errors`, `enums`, `success-messages`, `notifications`), specs, e a
  regeneração do SDK do app.
- `ADR-001` foi atualizado com a lista real de bounded contexts.

### O que ficou, e por quê

Chat · colaboração em currículo · compartilhamento público + QR ·
acompanhamento de candidaturas · catálogo de tecnologias (alimenta o scoring
por dentro) · MEC · plataforma (com auditoria abaixo) · automação de
candidatura (mantida, inerte atrás de `automation.enabled`).

### Portão

`orphan-hooks-report.spec.ts` (app) **lista** hooks gerados sem consumidor a
cada `verify:arch`. Não reprova — impede que o entulho volte a crescer sem
ninguém ver.

## Auditoria da plataforma (sem consumidor no app em 2026-09-03)

Listadas, não removidas — dependem de decisão do dono:

| Grupo | Rotas | Observação |
| --- | --- | --- |
| `ui-metadata` | `/v1/me/menu`, `/v1/pages/*` | `/v1/enums/:key` passou a ser usado (labels de enum) |
| `test-runner` (admin) | 2 | ferramenta interna |
| `webhooks` | 5 | nenhum integrador cadastrado |
| `common` `/v1/enums/export-formats`, `config/password-policy` | 2 | |
| `jobs` | 21 de 22 hooks | só a busca é usada pelo app |
| `users` | 18 de 27 | admin e listagens |
| `chat` | 4 de 11 | moderação/admin |
| `notifications` | 2 de 9 | preferências por canal, digest |
| `techSkillsQuery`, `spokenLanguages`, `mec*`, `search` | — | usados por dentro (scoring, onboarding) mas não pelo app |

Relatório completo: `pnpm exec vitest run apps/client/src/static-analysis/orphan-hooks-report.spec.ts`.

## Consequências

- ~18 000 linhas e dezenas de tabelas a menos; CI e dicionários menores.
- Recuperar um grupo é reverter um commit e regenerar o SDK.
- A lista da auditoria é o próximo lote a decidir, não uma pendência
  técnica.
