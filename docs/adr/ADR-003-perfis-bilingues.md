# ADR-003: Perfis bilíngues (pt-BR + en) com tradução por LLM

## Status

**Aceito** — 2026-09-03 (substitui a versão proposta em 2026-09-02; as
seções marcadas *revisado* mudaram na implementação)

Complementa, no cliente, o
[ADR-0011 — dois locales: interface e conteúdo](../../../patch-careers-ui/docs/adr/0011-two-locales-chrome-and-content.md).

## Contexto

Um currículo existia em um idioma só: o que a pessoa digitou no onboarding.
Quem quer se candidatar fora precisava manter um segundo currículo à mão, e o
produto não ajudava em nada nisso.

A investigação achou três desenhos bilíngues iniciados e abandonados
(`Resume.contentPtBr/contentEn/primaryLanguage`, `LocaleContent` v1,
`DuplicateResumeRequest.language` copiando bytes), um motor de tradução pronto
e sem call site (`TranslationLlmPort.translateObject`, prompt `translate.v1`,
cache por hash) e um bug que resumia o problema: **`?locale=en` na exportação
devolvia conteúdo em português com títulos em inglês**, porque o locale só
resolvia `SectionType.translations`.

A regra que governa tudo veio do modelo do LinkedIn que o produto adotou:

| Superfície | Chrome (títulos, rótulos, datas, enums, botões) | Conteúdo (o que a pessoa escreveu) |
| --- | --- | --- |
| Perfil (`/profile`) | idioma do **app** | idioma da **versão escolhida** |
| Currículo, PDF, página pública | idioma do **documento** | idioma do **documento** |

O perfil é uma vista de uma pessoa; o currículo é um documento.

## Decisão

### 1. O idioma é uma dimensão do currículo, não um currículo a mais

Uma linha `Resume`, com a outra versão guardada **por item**. Dois `Resume`
irmãos foram rejeitados: a cota de 4 é global, `User.primaryResumeId` é FK
única, e cada escrita dobraria a fila de qualidade e o gasto de LLM.

### 2. Modelo: canônico + envelopes por locale *(revisado)*

```prisma
model Resume {
  language     String  @default("pt-BR")   // o único campo de idioma
  summary      String?                     // canônico
  headline     String?                     // migrado de User
  jobTitle     String?                     // canônico
  translations Json?                       // { "en": { data: { summary, headline, jobTitle }, sourceHash, translatedAt, origin } }
}

model SectionItem {
  content      Json    // canônico — inalterado
  translations Json?   // { "en": { data, sourceHash, translatedAt, origin } }
}
```

`origin ∈ derived | manual | diverged`. **`manual` e `diverged` nunca são
sobrescritos automaticamente.** `sourceHash` é o SHA-256 do subconjunto
traduzível do canônico (`hashSource`); `derivedState` compara e diz
`current | stale | missing`.

`LocaleContent` v1 e as colunas `contentPtBr/contentEn/primaryLanguage` foram
apagados (migração `20261213000000_bilingual_translations_columns`). O
vocabulário canônico é `pt-BR | en` (`LocaleSchema`, OpenAPI `LocaleTag`);
`UILanguage` e `UILanguageKebabSchema` saíram.

### 3. Um leitor, uma regra de resolução *(novo)*

`resolveStoredItem(content, translations, canonical, locale)` e
`resolveResumeProse(prose, translations, canonical, locale)` em
`shared-kernel/i18n/translation-envelope.ts`. **Todo** leitor de conteúdo
passa por eles — `GET /sections?locale=`, o carregador do DSL (PDF/HTML/
Typst), o payload público e o perfil público — e por isso não podem discordar.
O envelope é mesclado **sobre** o canônico: campos não traduzíveis (datas,
URLs, enums) mantêm o valor canônico; prosa é substituída; envelope ausente
cai no texto canônico marcado `missing`. Um leitor nunca vê um buraco (§8).

### 4. Escrita: worker com debounce, e "traduz agora" quando pedido

- `TranslationOnResumeChangedHandler` copia o padrão de `resume-quality`:
  `queue.remove` **antes** de enfileirar, debounce deslizante de 15 s, BullMQ
  com retentativas. O worker `resume-translation` é registrado pelo laço de
  `register-bc-workers.ts` ([ADR-004](./ADR-004-tarefas-de-fundo.md)).
- Traduz só o que mudou: item cujo `sourceHash` bate é pulado.
- `POST /v1/resumes/:id/translations/:locale` roda a derivação **agora**, com
  progresso por seção no canal SSE `translation:user:<id>`
  (`GET /v1/translation/subscribe`). É o que a primeira troca de idioma numa
  conta antiga dispara (§10).
- Onboarding: `onResumeReady` → `deriveNow`. As duas versões nascem juntas.

### 5. A política de tradução é por `(sectionTypeKey, semanticRole)`

Inalterada: `field-translation.policy.ts`, com a spec de paridade contra o
seed — que agora **roda** no pre-commit e no CI (`test:static` inteiro).

### 6. O cargo é traduzido; o readiness lê o rótulo canônico *(revisado)*

A versão anterior bloqueava a tradução de `role`/`jobTitle` porque o readiness
casa `targetRoleLabel` por `contains`. Resolvido pelo outro lado: **o readiness
usa sempre o rótulo canônico** (`prisma-target-role-coverage.repository.ts`);
a tradução é só para leitura. `JOB_TITLE: YES` na política está certo.

### 7. `headline` e `bio` moram no currículo *(revisado)*

`Resume.headline` e `Resume.summary` são a fonte; `User.headline/bio` são
lidos só como fallback de contas que nunca terminaram o onboarding
(`PROSE_FROM_RESUME`) e serão dropados quando o app que grava no currículo
estiver no ar (ordem: backend aditivo → app → limpeza).

### 8. O atraso é visível; a falha também

`translationState` (`current | stale | missing`) vem em cada item resolvido.
O cliente mostra o texto antigo com a marca de desatualizado; a troca de
idioma **nunca bloqueia** — o que já existe segue visível.

### 9. Freios

- `translation.enabled` (flag). Desligada: o seletor continua, nada novo é
  gerado.
- Custo por execução em `TranslationCostLedger` (`costUsdMicros`), preço em
  `OPENAI_TRANSLATION_PRICE_USD_MICROS_PER_1K_TOKENS`; ligado junto com o do
  scoring.
- Teto mensal por usuário `TRANSLATION_MONTHLY_CAP_USD_MICROS` (~US$ 1). Ao
  estourar, a execução é `skipped: monthly-cap`; o cliente explica.
- Rate limit em `durationSeconds` explícitos (a heurística "≥1000 = ms" que
  tornava 3600 s em 3 s foi removida).

### 10. Backfill preguiçoso, com progresso

Contas antigas são traduzidas na primeira troca de idioma, na hora, com
progresso por seção. O custo é proporcional a quem usa.

### 11. Edição nos dois sentidos *(novo — substitui "sem edição bidirecional")*

Ao salvar um item, o servidor propõe a reescrita da outra versão
(`POST .../items/:id/rewrite` → `{ current, proposal }`) e o cliente mostra um
diff por campo: **aceitar / recusar / editar** cada alteração.

- Editou o canônico: `PATCH` normal e, sobre a outra versão,
  `PUT .../translations/:locale` com `origin: manual` (editou ou aceitou parte),
  `diverged` (recusou tudo) ou nada (aceitou tudo — o worker deriva).
- Editou a versão derivada: a prosa vai para o envelope como `manual`; os
  campos não-prosa e as propostas aceitas vão para o canônico.

A proposta é cortesia: se o LLM falha, a edição salva do mesmo jeito e a outra
versão fica marcada como desatualizada.

### 12. A saída resolve o conteúdo pelo locale *(implementado)*

PDF, HTML, DOCX e página pública resolvem itens **e** prosa do currículo pelo
locale (§3). `?lang=` ausente na exportação = idioma do documento, não pt-BR.
A página pública vive em dois endereços — `/u/…` (pt-BR) e `/en/u/…` (en) —,
cada um pedindo `?locale=`; o cache público é chaveado por
`résumé + locale` e invalidado por padrão.

### 13. Duplicar traduz de verdade *(novo)*

Duplicar para o outro idioma garante a versão-alvo no original (execução
síncrona, freios aplicam), copia o texto **resolvido** como canônico da cópia,
descarta os envelopes (descreveriam o sentido errado) e pede ao worker a
versão reversa. Cópia no mesmo idioma leva os envelopes.

### 14. Importação lê o idioma do texto *(novo)*

`detectLocale` (palavras funcionais, determinístico, sem custo) decide o
`language` de currículos vindos de PDF e JSON/LinkedIn; indetectável deixa o
default da coluna.

### 15. O idioma da conta é usado *(novo)*

`UserPreferences.language` é normalizado, escrito pelo app quando a interface
muda, adotado num aparelho sem escolha própria, e lido por notificações e
**todos** os e-mails (sete templates + lembrete de candidatura + cápsula do
tempo, em pt-BR e en). Pré-cadastro, sem conta, usa `Accept-Language`.

## Consequências

- `?locale=en` faz o que promete em todas as superfícies.
- A cota de 4 currículos continua significando 4.
- Cada leitura de conteúdo passa por um único resolvedor; uma regra nova
  (ex.: outro `origin`) muda em um lugar.
- Custo é rastreado e limitado antes de existir volume.
- Dívida assumida: `User.headline/bio` ainda existem como fallback até o drop;
  o detector de idioma é heurístico (duas línguas, palavras funcionais) e
  devolve `null` em vez de chutar.
- Superfície removida junto: rotas cruas `/v1/translation/{text,batch,pt-to-en,
  en-to-pt}` e `TranslateResumeUseCase` v1
  ([ADR-005](./ADR-005-remocao-de-superficie-sem-consumidor.md)).
