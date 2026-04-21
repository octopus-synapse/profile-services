# `@packages/i18n`

Single source of truth for every localized string the backend emits — error
codes today, enum labels and notification templates in follow-up waves.

## Why a package (and not `src/`)

- Codes are declared in `DomainException` subclasses scattered across every
  bounded context. The dictionary must be importable by every BC without
  creating a cyclic dependency back into any of them.
- The package has **zero runtime deps** and is consumed by `I18nService`
  (backend) today; tomorrow the frontend can consume the same TS module
  (either via publication or a direct monorepo import).
- Keeping it outside `src/bounded-contexts/platform/i18n/` makes the
  intent explicit: this is a cross-cutting data asset, not a BC.

## Shape

```ts
import type { ErrorCode, LocalizedMessages } from '@packages/i18n';

// Each code declared by a concrete DomainException subclass has a
// `{ en: string; 'pt-BR': string }` entry.
const entry: LocalizedMessages = ERROR_DICTIONARY['ACCOUNT_ALREADY_ACTIVE'];
```

## Adding a new code

1. Declare the subclass with `readonly code = 'NEW_CODE'` (the abstract
   contract on `DomainException` forces this).
2. Add the entry to `src/errors.ts`:
   ```ts
   NEW_CODE: {
     en: 'Short user-facing English message',
     'pt-BR': 'Mensagem curta para o usuário em português',
   },
   ```
3. Run `bun run test:arch` — the catalog-parity test fails until the
   entry exists in both locales.

## Template placeholders

Dictionary values use `{name}` named placeholders. Values come from any
own-enumerable public field on the exception instance. Null params resolve
to empty string; unknown placeholders stay intact (with a warn log) so
the missing param surfaces in staging before prod.

Do **not** use `${...}` template-literal syntax — the catalog is static
JSON semantically; the arch test rejects leaked template-literal bits.

## Follow-ups

- `src/enums.ts` — Prisma enum labels served by `/v1/i18n/dictionary/enums`.
- `src/notifications.ts` — notification templates with `{param}` keys.
