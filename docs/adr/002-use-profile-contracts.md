# ADR-002: Use profile-contracts for Shared Validation

## Status

Accepted

## Context

The profile platform consists of multiple services (backend, frontend, api-client) that need to validate the same domain entities (users, resumes, authentication). Previously, each service maintained its own validation schemas, leading to:

**Problems:**

- **928 lines of duplicate code** across backend and frontend
- **Validation drift** - username rules differed between settings and onboarding
- **Data corruption risk** - frontend accepting invalid data that backend rejects
- **4x maintenance burden** - same change required in 4 places

**Example Violation:**

```typescript
// Backend (auth.schemas.ts)
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(8),
});

// Frontend (onboarding/username-step.tsx)
function validateUsername(value: string) {
  if (value.length < 3) return false;
  // Missing uppercase check - DRIFT!
}
```

## Decision

**All domain entity validation MUST use `@octopus-synapse/profile-contracts` as the single source of truth.**

### When to Use Contracts

✅ **Use contracts for:**

- User authentication (email, username, password)
- Resume entities (experience, education, skills)
- Onboarding data (personal info, professional details)
- Any data shared between frontend and backend

❌ **Do NOT use contracts for:**

- Backend-only concerns (pagination, sorting, filters)
- Infrastructure (database IDs, timestamps, internal status)
- Framework-specific types (Express Request/Response, NestJS DTOs)

### Implementation Pattern

```typescript
// ✅ CORRECT - Import from contracts
import {
  RegisterSchema,
  LoginSchema,
  UsernameSchema,
} from '@octopus-synapse/profile-contracts';

export const registerDto = RegisterSchema;
export type RegisterDto = z.infer<typeof RegisterSchema>;

// ❌ WRONG - Local duplication
const registerSchema = z.object({
  email: z.string().email(), // DUPLICATE!
  username: z.string().min(3), // DUPLICATE!
});
```

### Enforcement

**CI Workflow:** `.github/workflows/validate-contracts.yml` blocks PRs containing:

- Duplicate email/username/password validation
- Missing contract imports in auth/onboarding modules
- Hardcoded validation functions that should use contracts

**Pre-commit Hook:** Husky runs the same checks locally for fast feedback

## Consequences

### Positive

- **Single source of truth** - Change validation once, applies everywhere
- **Zero drift** - Frontend and backend always use identical rules
- **Type safety** - Shared TypeScript types across entire stack
- **Faster development** - No duplicate maintenance
- **Data integrity** - Impossible for frontend to accept invalid data
- **Reduced bugs** - Username uppercase bug fixed automatically

### Negative

- **Dependency coupling** - All services depend on contracts package
- **Breaking changes** - Schema changes require coordinated releases
- **Learning curve** - Developers must understand contract-first workflow

### Migration Impact

**Completed:**

- Backend auth validation ✅ (#19)
- Backend onboarding validation ✅ (#19)

**Remaining:**

- Frontend username validation (V16) - 2 duplicate functions still exist
- api-client types (V19) - 300+ lines of duplicate types

**Lines Removed:** 228 lines (backend only)  
**Target:** 928 total lines when V16 and V19 complete

## References

- **Epic:** [#14 Contract Violations Resolution](https://github.com/octopus-synapse/profile-services/issues/14)
- **Implementation:** [#19 Backend Contracts Integration](https://github.com/octopus-synapse/profile-services/pull/40)
- **Tracking:** [#25 Eliminate Dual Source of Truth](https://github.com/octopus-synapse/profile-services/issues/25)
- **Documentation:** [README - Contract-Driven Development](../README.md#contract-driven-development)
