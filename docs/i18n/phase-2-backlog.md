# Phase 2 — migration backlog

Phase 1 discovered **354 ambiguous throws** (reusing generic codes) and **131
unstable throws** (`new Error(...)` / `new HttpException(...)` with no stable
code). Phase 2 ships the **replacement mechanism** (`DomainError` +
`DomainErrorFilter` + `DomainZodValidationPipe`) but does **not** rewrite
every callsite. The list below is the concrete migration roadmap.

Each migrated throw should use:

```ts
throw new DomainError({
  code: 'STABLE_CODE',
  status: 409,
  params: { /* structured data the catalog can interpolate */ },
});
```

## Ambiguous buckets (static counts from `docs/i18n/inventory-errors.json`)

| Shared code | Count | Action |
| --- | --- | --- |
| `ENTITY_NOT_FOUND` | 136 | Leave as-is — already parametric (`entityType`, `identifier`). Only register in MessageCodeRegistry once with params `{ entityType, identifier }`. |
| `VALIDATION_ERROR` | 85 | Migrate each throw: every callsite owns a specific business rule (e.g. `ONBOARDING_STEP_OUT_OF_ORDER`, `SUBSCRIPTION_EXPIRED`). ~85 new codes. |
| `FORBIDDEN` | 81 | Group by action: `CANNOT_APPLY_TO_OWN_JOB`, `CANNOT_FOLLOW_SELF`, `SESSION_NOT_OWNED`, etc. ~20 new codes covering the bulk. |
| `CONFLICT` | 45 | Migrate each: `EMAIL_IN_USE`, `USERNAME_TAKEN`, `ALREADY_APPLIED`, `ALREADY_CONNECTED`, etc. |
| `UNAUTHORIZED` | 7 | Migrate: `INVALID_CREDENTIALS`, `SESSION_EXPIRED`, etc. |

## Unstable throws (131)

All `throw new Error('...')` and `throw new HttpException(...)` occurrences
must either:

1. Bubble up as unexpected → filter catches them as 500 `INTERNAL`. These are
   acceptable when the caller truly cannot recover.
2. Be upgraded to a `DomainError` with a stable code, when the error is
   user-facing.

See `docs/i18n/inventory-errors.json` → `unstable[]` for the full list with
file:line coordinates.

## Prioritization

Migrate in this order — pick off the **user-facing flows first**, since those
are what the i18n catalog covers in Phase 3:

1. **Auth** (login, signup, session, 2FA, password reset) — every user hits these.
2. **Onboarding** — second most-hit, many custom messages today.
3. **Consent** — already structured; quick win.
4. **Jobs** (apply, create, bookmark) — medium traffic, today heavily generic.
5. **Feed / social** (like, repost, comment, report).
6. **Resume** CRUD.
7. **Admin** — low traffic but user-visible.

Everything else can stay on the legacy filter until a feature change forces migration.
