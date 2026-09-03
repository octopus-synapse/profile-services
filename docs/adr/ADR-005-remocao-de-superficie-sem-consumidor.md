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

## Segunda leva (2026-09-03): a auditoria decidida rota a rota

O relatório de órfãs foi refeito comparando cada hook **e** cada função do
SDK contra o app inteiro (o relatório antigo só via hooks, e marcava como
órfãs rotas chamadas pela função direta — `postV1AuthForgotPassword` — ou
por código escrito à mão, como o upload multipart da foto). O dono decidiu
grupo a grupo.

### Removido

| Grupo | Rotas | Por quê |
| --- | --- | --- |
| `ui-metadata`: `/v1/me/menu`, `/v1/pages/*` | 3 | o app compõe a própria navegação e telas |
| `webhooks` | 5 | nenhum integrador, duas tabelas dropadas |
| `test-runner` (admin) | 2 | rodar teste é CI, não rota HTTP; era o único código de aplicação que abria shell |
| Export LaTeX, JSON e zip | 3 | ficam PDF e DOCX |
| Moderação admin do chat | 2 | ler conversa alheia não fica de reserva |
| Preferência `weeklyDigest` | — | o digest saiu com o analytics |
| Admin de catálogos (skills, nichos, áreas, línguas) | 25 | `prisma/seeds/**` é a fonte |
| Admin de onboarding | 8 | idem |
| Admin de tipos de seção (BC inteiro) | 6 | idem, e criar seção pela rota pulava os portões de tradução |
| Admin de perguntas de fit | 5 | idem |
| Admin de estilos de currículo | 3 | idem |
| Admin de colaborações | 3 | não há colaboração em uso para moderar |
| `/admin/alerts`, `/admin/dashboard/metrics`, `/admin/metrics/overview` | 3 | a primeira contava perfis-sombra removidos; as outras duplicam o Datadog |
| Onboarding legado (`POST /v1/onboarding`, progress, status, previous, restart, save) | 7 | o fluxo por sessão substituiu |
| Árvore duplicada do catálogo (`/v1/tech-areas`, `/v1/tech-niches`, `/v1/tech-skills`) | 6 | o mesmo dado que `/v1/tech-skills/*` |
| `/v1/resumes/:id/skills` | 4 | escreviam itens de seção, que é o que o editor faz |
| `/v1/i18n/dictionary/*` e `/v1/enums/{export-formats,user-roles,section-types}` | 6 | o app carrega os dicionários gerados e lê rótulo em `/v1/enums/:key` |
| Fit por vaga, apagar meu fit, listar respostas | 4 | o questionário que o app usa fica |
| DSL (`/v1/dsl/*`) | 4 | o motor continua, chamado por dentro pelo export |
| Currículo: `manage/*`, `:id/full`, `thumbnail.svg` | 5 | miniatura vem da pré-visualização em PDF |
| Chat: silenciar e fixar conversa | 2 | conforto de lista longa sem volume |
| Busca: similar e sugestões | 2 | a busca global fica |

### Mantido, com o motivo

| Grupo | Rotas | Por quê |
| --- | --- | --- |
| `/v1/users/manage/*` | 7 | único caminho de suporte sem SQL em produção |
| Feature flags admin | 4 | desligar tradução ou automação sem deploy |
| Permissão extra por usuário | 3 | o guard de permissão lê essas linhas; sem as rotas ninguém as cria |
| MEC | 11 | dado real caro de reconstruir; Formação vai autocompletar |
| Upload | 3 | a foto de perfil usa a rota por um multipart escrito à mão |
| Currículo público por link + QR | 10 | par do compartilhamento que fica |
| Colaboração | 9 | mantida no backend por decisão do dono |
| Importação PDF/LinkedIn, versões, 2FA, consentimento | 19 | esperam tela, já no plano |
| Health, docs, métricas Prometheus, well-known, realtime | 10 | infraestrutura |

Resultado: as órfãs caíram de 250 em 341 hooks (73 %) para 143 em 255
(56 %), e o que sobra é ou infraestrutura, ou uso interno, ou tela
planejada.

### Buracos que a auditoria abriu, não fechou

- **Reaceitação de termos não existe de ponta a ponta.** O aceite inicial
  **é** gravado: o cadastro envia `acceptedTosVersion` e
  `acceptedPrivacyVersion`, e `CreateAccountUseCase` persiste os dois
  consentimentos com IP e user agent. O que falta é o depois: quando a versão
  publicada muda, `consentGuardStage` é um no-op (não bloqueia nada) e o app
  não tem tela para aceitar a nova versão, então `/v1/users/me/accept-consent`
  e `/consent-status` nunca são chamados. Fechar o ciclo entrou no plano.
- **Validação de username perdeu cobertura de integração.** Ela era afirmada
  por `PUT /v1/onboarding/progress`; deve ser repontada para
  `PATCH /v1/users/username` e `POST /v1/users/username/validate`.
- **Existem dois sistemas de vaga.** O app usa `/v1/jobs/external/*` (busca
  agregada, salvar, "você se candidatou?") e ele funciona ponta a ponta, com
  tela de detalhe e acompanhamento de candidaturas. As 14 rotas órfãs em
  `/v1/jobs/*` são um **quadro de vagas interno**: publicar, editar, apagar,
  ver candidatos, importar vaga por URL, mais candidatar-se e favoritar uma
  vaga interna. A metade do empregador é outro produto; a metade do candidato
  duplica o fluxo externo. Decisão pendente do dono.
- **Importação do LinkedIn é um esqueleto.** `/v1/resumes/imports/linkedin`
  lança 503 por desenho. A tela de importação oferece só PDF.

## Consequências

- ~18 000 linhas e dezenas de tabelas a menos; CI e dicionários menores.
- Recuperar um grupo é reverter um commit e regenerar o SDK.
- A lista da auditoria é o próximo lote a decidir, não uma pendência
  técnica.
