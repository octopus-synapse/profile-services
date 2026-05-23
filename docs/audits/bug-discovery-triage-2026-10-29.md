# Bug Discovery triage — 2026-10-29

Triagem dos `BUG-*` specs que continuam vermelhos após o sweep de
rate-limits / status codes / envelope strip / fix #4 (AuditLog race).

Os specs vivem em `test/infrastructure/integration/auth/`,
`/resume/`, `edge-cases`, `error-handling`. Cada `describe('BUG-XXX-NNN')`
documenta um cenário e ou (a) reproduz um bug real conhecido
(comentário `EXPECTED TO FAIL IF …`), ou (b) verifica um
comportamento esperado.

Status mapeado abaixo é a saída da última run de `bun run test:integration`
após o fix #4 e os sweeps.

---

## Password Reset (`auth/password-reset-security.integration.spec.ts`)

| BUG | Estado | Diagnóstico | Recomendação |
|---|---|---|---|
| PWD-001 Rate Limit on Forgot Password | ✅ pass | OK | — |
| PWD-002 Token Reuse Race | ✅ pass | OK | — |
| PWD-003 Old Token Valid After New Request | ❌ fail | `EXPECTED TO FAIL IF TOKENS ACCUMULATE` — atual: novo token NÃO invalida o antigo. **Bug real**: a tabela `PasswordResetToken` acumula sem revoke. | **Fix**: na geração de novo token, soft-revoke todos os outros do mesmo userId (`UPDATE … SET revokedAt = now() WHERE userId = ? AND revokedAt IS NULL`). |
| PWD-004 Token Enumeration via Timing | ✅ pass | Comparação de timing dentro do limite | — |
| PWD-005 Expired Token Handling | ❌ fail | Recebia 429 (rate-limit). Após sweep do `clearAuthRateLimits` (`/v1/auth/reset-password` adicionado), espera 400. **Provável já corrigido**. | Validar na próxima run. |
| PWD-006 Reset for Non-Existent User | ✅ pass | OK | — |
| PWD-007 Weak Password Accepted | ✅ pass | OK | — |
| PWD-008 Session Invalidation After Reset | ❌ fail | Spec verifica que sessões antigas são invalidadas após reset. Atual: sessões antigas permanecem ativas. **Bug real**: faltando `revokeUserSessions(userId)` no reset-password use case. | **Fix**: emitir `PasswordResetCompletedEvent` que dispara handler `InvalidateSessionsOnCredentialChangeHandler` (já existe pro `PasswordChangedEvent` — só falta wire pro reset). |

## Resume Delete Cascade (`resume/cascade-delete.integration.spec.ts`)

| BUG | Estado | Diagnóstico | Recomendação |
|---|---|---|---|
| CASCADE-001 Orphaned Sections | ❌ fail | `EXPECTED TO FAIL IF ORPHANS EXIST`. Atual: sections órfãs sobrevivem ao DELETE do resume. **Bug real**: faltando `onDelete: Cascade` no Prisma schema OU o handler manual de cleanup tem bug. | **Investigar**: olhar `ResumeSection.resumeId @relation`. Se já tem Cascade, o handler `cleanupSectionsOnResumeDelete` está duplicado e race-flaky. |
| CASCADE-002 Stale Cache After Delete | ❌ fail | Cache de `resume:${id}` mantém payload após DELETE. **Bug real**: falta invalidação no DELETE handler. | **Fix**: chamar `cacheInvalidationService.invalidate({entity:'resume', id})` no `delete-resume.use-case.ts` antes de `prisma.resume.delete`. |
| CASCADE-003 Concurrent Delete Race | ❌ fail | Dois DELETEs concorrentes — um deveria 404. Atual: ambos retornam 200/204. **Bug real**: `deleteMany` é idempotente; precisa `delete` (strict) + `try/catch` P2025. | **Fix**: trocar para `prisma.resume.delete({where: {id, userId}})` que throw P2025 → 404. |
| CASCADE-004 Delete Non-Existent | ❌ fail | DELETE em ID inexistente retorna 200/204 em vez de 404. **Mesma causa que CASCADE-003**. | Fix igual. |
| CASCADE-005 IDOR | ✅ pass | OK | — |
| CASCADE-006 Cache Consistency on Failed Delete | ✅ pass | OK | — |
| CASCADE-007 User Cache After Resume Delete | ❌ fail | Cache `user:resumes:${userId}` (lista) não invalida quando um resume é deletado. **Bug real**: invalidação só faz `resume:${id}`, não a lista do owner. | **Fix**: invalidar também `pattern: user:*:resumes` ou enriquecer o helper. |
| CASCADE-008 Soft Delete vs Hard | ✅ pass | OK | — |
| CASCADE-009 Delete Without Auth | ✅ pass | OK | — |
| CASCADE-010 Versions & Analytics Cleanup | ✅ pass | OK | — |

## 2FA Security (`auth/2fa-security.integration.spec.ts`)

| BUG | Estado | Diagnóstico | Recomendação |
|---|---|---|---|
| 2FA-001 Token Reuse | ❌ fail | TOTP usado uma vez deve ser rejeitado na segunda. Atual: aceita. **Bug real**: faltando "used-window" tracking. | **Fix**: tabela `TwoFactorUsedToken { userId, code, usedAt }` com TTL 30s. Verificar antes de aceitar. |
| 2FA-002 Brute Force | ✅ pass | Rate-limit cobre | — |
| 2FA-003 Backup Code Reuse | ✅ pass | OK | — |
| 2FA-004 Time Window | ✅ pass | OK | — |
| 2FA-005 Bypass via userId Manipulation | ✅ pass | OK | — |

## Edge Cases (`edge-cases.integration.spec.ts`)

| BUG | Estado | Diagnóstico | Recomendação |
|---|---|---|---|
| 008 Unicode chars | ❌ fail | Chinese/Japanese/Korean (CJK) chars rejeitados em campos que deveriam aceitar (e.g. fullName). **Bug real**: regex de validation com `[A-Za-z]` em vez de `[\p{L}]`. | **Fix**: schemas relevantes (PersonalInfo.fullName, etc) — usar `/^[\p{L}\p{M}\p{N}\s'.,-]+$/u`. |
| 009 Very Large Page Numbers | ❌ fail | `?page=99999999` — backend não clamp. **Spec antigo OU bug**: `PaginationQuerySchema` deveria clamp a `totalPages`. | **Investigar**: schema clampa max=100/limit mas não page. Razoável clamp page também. |

## Error Handling (`error-handling.integration.spec.ts`)

| BUG | Estado | Diagnóstico | Recomendação |
|---|---|---|---|
| 026 Consistent 404 (non-existent resume) | ❌ fail | UUID válido + recurso inexistente retorna 400 INVALID_FOREIGN_KEY em vez de 404 ENTITY_NOT_FOUND. **Bug real**, é o mesmo do #8.1 (analytics). | Resolver junto com task #8.1/#8.2. |
| 026 Should not leak existence | ❌ fail | Resposta para "não existe" difere de "sem permissão". **Bug real**: vaza info de existência. | **Fix**: handlers de GET should `throw NotFound` antes de `throw Forbidden` consistentemente (ou vice-versa, mas uniforme). |
| 027 / 028 / 029-033 | ✅ pass | OK | — |

---

## Prioridade sugerida

**Alta (bugs de segurança)**:
1. PWD-003 — old token não revogado (token reuse window)
2. PWD-008 — sessões não invalidadas após password reset
3. 2FA-001 — TOTP reuse window
4. 026 — info disclosure 404 vs 403

**Média (correctness)**:
5. CASCADE-002 — stale cache após delete
6. CASCADE-003/004 — delete idempotente vs strict (404)
7. CASCADE-007 — invalidação de lista de resumes

**Baixa (UX edge cases)**:
8. CASCADE-001 — section orphans (precisa confirmar se é bug)
9. 008 — Unicode em fullName
10. 009 — page clamp

**Resolução automática (sweep)**:
- PWD-005 — após o sweep #6.1 do `clearAuthRateLimits` deve passar.

Cada item alta-prioridade vira ticket próprio. Esta seção é o material
do próximo planejamento.
