# ADR-003: Perfis bilíngues (pt-BR + en) com tradução por LLM

## Status

**Proposto** — 2026-09-02

## Contexto

Um currículo hoje existe em um idioma só: o que a pessoa digitou no onboarding.
Quem quer se candidatar lá fora precisa manter um segundo currículo à mão, e o
produto não ajuda em nada nisso.

A investigação do código achou três desenhos bilíngues **já iniciados e todos
abandonados**, sobrepostos:

1. `Resume.contentPtBr` / `Resume.contentEn` / `Resume.primaryLanguage` —
   colunas Json que existem no schema, têm índice, e **nenhum caminho de
   criação, atualização ou onboarding escreve nelas**. São `null` para todo
   usuário real. Os únicos escritores são o snapshot/restore de versão
   (cópia literal) e um stub de shadow-profile que grava `{ sections: [] }`.
2. `LocaleContent` (`resumes/domain/value-objects/locale-content.vo.ts`) — um
   value object desenhado exatamente para isto
   (`sections: Record<sectionKey, Record<locale, LocalizedSection>>`, com
   `resolveForLocale`, `addLocale` e até um `migrateFromLegacy` para as colunas
   mortas acima). **Sem coluna, sem call site.**
3. `DuplicateResumeRequest.language` — aceita qualquer string, copia o conteúdo
   byte a byte e nem atualiza `primaryLanguage`. Passar `"en"` devolve um
   currículo em português rotulado como inglês. É a coisa mais enganosa da
   área hoje.

Três fatos que reordenam o problema:

- **O serviço de tradução já foi descontinuado.** O container LibreTranslate
  saiu do `docker-compose` (commit `71fe65fd` introduziu, e já não existe hoje);
  o `openai-translation.adapter.ts` abre dizendo *"Replaces the LibreTranslate
  HTTP service"*. Sobrou uma menção no template compartilhado
  `octopus-workflows/.github/workflows/_e2e-with-backend.yml`, que é lixo a
  varrer — não há o que descontinuar.
- **O motor de tradução já está pronto.** `TranslationLlmPort.translateObject`
  traduz um objeto preservando a estrutura numa chamada só, com cache Redis de
  30 dias cuja chave inclui o SHA do prompt (editar o prompt invalida o cache
  sozinho), chunking em lotes de 25 com isolamento de falha, e um prompt
  (`translate.v1.ts`) já endurecido contra prompt injection e já ensinado a
  pular URLs, e-mails, UUIDs e identificadores.
- **Nada disso está ligado a currículo.** `ResumeTranslationService` e
  `TranslateResumeUseCase` existem e não têm um único call site fora dos
  próprios testes. Não há rota, handler, worker nem persistência.

E um bug que este trabalho conserta de passagem: **`?locale=en` na exportação
hoje devolve conteúdo em português com títulos de seção em inglês**, porque o
`locale` só resolve `SectionType.translations` e o `SectionItem.content` passa
intocado.

## Decisão

### 1. O idioma é uma dimensão do currículo, não um currículo a mais

Uma linha `Resume`, com o conteúdo por locale dentro dela via `LocaleContent`.
As colunas `contentPtBr`/`contentEn` são migradas com o `migrateFromLegacy` que
já existe e removidas.

A alternativa natural — dois `Resume` irmãos, um pt e um en — foi **rejeitada**
por três colisões duras:

- `MAX_RESUMES_PER_USER = 4` é uma constante global, sem planos nem override.
  Dobrar as linhas corta a capacidade do usuário pela metade, faz
  `GET /v1/resumes/slots` reportar `used: 2` numa conta nova, e **impede o
  backfill** de quem já tem 3 ou 4 currículos (`enforceQuotaInTx` lança).
- `User.primaryResumeId` é uma FK única. Não cabe "mestre em pt" e "mestre em
  en", e não há endpoint para trocar qual é o mestre.
- Cada escrita passaria a emitir dois `ResumeUpdatedEvent`, dobrando a fila de
  `resume-quality` e o gasto de OpenAI. Pior: `ReadinessScoreHistory` só pontua
  o currículo primário, então o gêmeo nunca receberia nota.

### 2. Um idioma é canônico; o outro é derivado

A pessoa escreve num idioma — o `primaryLanguage` — e o outro é sempre saída de
máquina, sobrescrita a cada tradução. Sem edição bidirecional e portanto sem
conflito para resolver.

A UI **precisa** marcar a versão derivada como automática. Um texto que o
usuário acha que editou e que é silenciosamente sobrescrito é pior do que não
ter tradução.

### 3. Fila com debounce, não escrita síncrona

Copiar o padrão de `resume-quality-on-resume-updated.handler.ts`, que já resolve
isto bem: evento com `changedFields`, `queue.remove(...)` **antes** de
enfileirar (para a rajada de salvamentos reiniciar o timer em vez de ser
deduplicada), debounce deslizante, BullMQ com 3 tentativas e backoff
exponencial.

Nunca dentro da transação de onboarding: ela tem timeout de 120s e uma chamada
de LLM com 60s de timeout não tem o que fazer lá dentro.

### 4. Traduz só o que mudou

O evento já carrega `changedFields` e o cache já é por hash de conteúdo, então
item intocado nem vira chamada. Falta o mapeamento `campo alterado → item`, que
hoje ninguém faz.

### 5. A política de tradução é por `(sectionTypeKey, semanticRole)`

Todo campo já carrega um `semanticRole` no seed, e ele quase basta:

| Traduz | Não traduz |
| --- | --- |
| `DESCRIPTION` (11 das 17 seções) | `ORGANIZATION`, `ORGANIZATION_DOMAIN` |
| `HIGHLIGHTS` (`achievements`, `highlights`) | `PERSON_NAME` |
| `ACHIEVEMENT` (`placement`) | `URL`, `EMAIL`, `PHONE` e afins |
| `SUMMARY_TEXT` | datas ISO (formatação é render) |
| | enums fechados — já localizados por `packages/i18n` |

O papel sozinho erra em dois lugares, e é por isso que a chave é o **par**:

- `SKILL_NAME` é "React" em `skill_set_v1` (não traduz) e "Liderança" em
  `soft_skill_set_v1` (traduz).
- `TITLE` é prosa num prêmio ("Employee of the Year") e nome de credencial numa
  certificação ("AWS Certified Solutions Architect", que traduzido vira uma
  credencial inexistente).

Dos ~40 campos das 17 seções ativas, **só ~9 carregam prosa de verdade**. O
risco não é a qualidade da tradução; é o campo que parece traduzível e não é.

### 6. O cargo é traduzido — mas o pré-requisito é maior do que este ADR supôs

`role` é traduzido: um currículo em inglês com o cargo em português fica pela
metade.

**Correção — a versão original deste ADR errou o diagnóstico.** Ela dizia que o
Readiness casa `targetRoleLabel` contra a taxonomia `RoleTitle` e que bastaria
migrar o join para `targetRoleId`. A implementação mostrou que não:

- `grep -rn "RoleTitle" src/bounded-contexts/job-match/` devolve **zero**. A
  taxonomia não participa do scoring.
- O que `prisma-target-role-coverage.repository.ts` faz é
  `job.findMany({ where: { title: { contains: label, mode: 'insensitive' } } })`
  sobre as vagas internas, com fallback de LLM quando agrega menos de 5
  habilidades.
- E `targetRoleId` **não pode ser preenchido hoje**: `RoleTitleItemSchema`
  (`src/bounded-contexts/roles/roles.routes.schemas.ts:17`) expõe `label`,
  `lang`, `source`, `isPreferred`, `seniority` — **e nenhum `id`**. O
  `GET /v1/roles/search` fisicamente não tem como devolver um id para o cliente
  guardar.

O risco que motivou a decisão continua real — traduzir o rótulo quebra o
`contains` em silêncio. Mas "consertar o join" não é um conserto: é construir
um caminho de resolução que não existe **e** alargar um contrato público.

Enquanto essa decisão não for tomada, o cargo **não é traduzido**. Os passos que
dependem disso (write-through e leitura por locale, no que toca a `role`) ficam
bloqueados junto.

### 7. `headline` e `bio` mudam de casa

As duas são prosa e moram no `User`, que não tem dimensão de locale. Vão para o
`LocaleContent` do currículo; o `User` fica só com identidade (nome, telefone,
links, username).

Isso também mata uma duplicação que já existe hoje: o onboarding grava o mesmo
resumo em **`User.bio` e `Resume.summary`** — dois lugares para o mesmo texto,
que viraria quatro num modelo bilíngue.

### 8. O atraso é visível; a falha também

Cada item derivado guarda o hash da origem que o gerou e o carimbo da tradução.
Sem isso não há como saber que está velho. A UI mostra o conteúdo antigo com um
indicador discreto de "atualizando" e, se falhar de vez, um aviso com repetir.
Nada bloqueia.

### 9. Quatro freios, todos

Nenhum existe hoje no caminho de tradução — o de scoring tem os equivalentes.

- **Feature flag** `translation.enabled`, espelhando
  `scoring.content-quality.enabled`. Desligar degrada para monolíngue em vez de
  quebrar.
- **Custo por usuário** em `costUsdMicros`, como `ResumeQualityScoreHistory`.
  Hoje o rastreio existe só no scoring e vem **desligado por padrão** (o preço
  em env não está setado) — ligar os dois faz parte disto.
- **Teto mensal por usuário**, contra a conta que salva 500 vezes por dia.
- **Rate limit** nas rotas `POST /v1/translation/*`, que hoje são autenticadas
  mas sem guard nenhum. O guard `{ id: 'rate-limit' }` já existe.

### 10. Backfill preguiçoso

Ninguém é traduzido até mexer no perfil. O custo se espalha no tempo e é
proporcional a quem usa; a base inteira nunca vira uma fatura única — o que
importa porque, sem rastreio de custo ligado, **não dá nem para estimar uma
migração em massa antes de rodá-la**.

Consequência aceita: contas paradas ficam monolíngues, e a página pública delas
no idioma derivado fica vazia.

### 11. `pt-BR` / `en` é o vocabulário canônico

Existem três hoje para o mesmo conceito:

```
Resume.language / primaryLanguage   "pt-br"           String livre, sem enum
packages/i18n                       "pt-BR" | "en"    tipado, com dicionários
TranslationLlmPort                  "pt" | "en"
```

Vence o do `packages/i18n`: é o único que já é tipo, tem dicionários, tem 11
specs de paridade guardando e é o mesmo do cliente. As colunas migram.

### 12. A saída recebe o locale explicitamente

PDF, DOCX e página pública passam a resolver o **conteúdo** pelo locale, caindo
no `primaryLanguage` quando não vier. É o que conserta o bug de hoje e o que dá
sentido a ter um currículo em inglês.

## Consequências

**Positivas**

- Três desenhos bilíngues abandonados viram um, e as colunas mortas somem.
- `?locale=en` passa a fazer o que promete.
- A cota de 4 currículos continua significando 4 currículos.
- O motor, o cache, o prompt e o padrão de fila já existem — o trabalho é
  ligação, não construção.

**Negativas / riscos**

- Migrar `headline`/`bio` para o currículo é migração de dados com janela.
- Migrar o Readiness para `targetRoleId` é pré-requisito e mexe em scoring, que
  é área sensível.
- O invariante de i18n do repositório é **sem fallback**:
  `MissingFieldTranslationError` é lançado em runtime e 11 specs de paridade
  quebram o CI. Toda superfície bilíngue nova precisa do seu dicionário e da
  sua spec.
- `LocaleContent` precisa de coluna e de migração a partir de
  `SectionItem.content`, que hoje é o conteúdo real e não tem dimensão de
  locale. `ResumeSection` tem `@@unique([resumeId, sectionTypeId])`, o que
  impede a saída preguiçosa de duas seções lado a lado.

**Descoberto durante a implementação, fora do escopo deste ADR mas bloqueante**

- **Três bounded contexts declaram workers que ninguém consome.**
  `resume-quality`, `job-match` e `notifications` retornam um array
  `workers: ReadonlyArray<BcWorkerBinding>` cujo comentário diz que o bootstrap
  faria `queue.register(b.queue, b.process)` para cada um — **e o bootstrap não
  tem esse laço**. Só `CACHE_INVALIDATION_QUEUE` é registrado, inline. Quem
  funciona (`automation`, e o lembrete de fit em `notifications`) chama
  `queue.register` explicitamente.

  Consequência em produção: o recompute de qualidade por IA, o
  `job-match-recompute` e as recomendações diárias **são enfileirados e nunca
  consumidos**. Isso provavelmente explica boa parte dos `contentQualityScore`
  nulos. O worker de tradução precisa seguir o padrão explícito de
  `registerAutomationJobs`, ou nasce morto igual.

- **A chave de cache do currículo público não tem locale**
  (`public:resume:${resumeId}`). Sem re-chavear, o idioma do primeiro leitor é
  servido a todos.

- **`LocaleContent.sections` não tem identidade de item.** Os itens são um array
  posicional, e tanto "traduzir só o que mudou" quanto a proveniência por item
  precisam de identidade. Chavear por `SectionItem.id` é o caminho óbvio, mas
  muda a forma publicada do VO.

- **Existe um quarto vocabulário de idioma**: `UILanguageKebabSchema`
  (`'en' | 'pt-br'`) em `platform.enum.ts`, mapeado a `Prisma.UILanguage`. É
  outro conceito (idioma da interface), mas convive com os três já citados.

**Aberto**

- Importação (PDF, LinkedIn, JSON, GitHub) é o elo fraco: é o único caminho em
  que o conteúdo chega num idioma que não escolhemos, e **hoje nada registra
  qual era**. `Resume.language` fica no default `"pt-br"` em toda importação.
  Detectar o idioma de origem (`detectLanguage` já existe no port) é trabalho
  próprio.
- `CompletionResult` é `{ resumeId }` no singular. Com um currículo só, isso
  continua válido — mas o onboarding hoje nunca grava `language` nem
  `primaryLanguage`, então todo currículo nasce `"pt-br"` mesmo quando a pessoa
  fez o onboarding em inglês. Isso precisa ser corrigido junto, ou o idioma
  canônico nasce errado.
