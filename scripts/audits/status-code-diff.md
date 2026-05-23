# Status code mismatches — sweep A diff

Total mismatches: **21**

Cada linha abaixo é um assert `expect(res.status).toBe(N)` cujo N
não bate com a route table extraída de `*.routes.ts`.

| Spec | Line | Method | Path | Current | Expected | Source |
|---|---:|---|---|---:|---:|---|
| `test/infrastructure/integration/analytics-tracking.integration.spec.ts` | 105 | GET | `/api/v1/resumes/${resumeId}/analytics/views?period=month` | **201** | **200** | default-200 |
| `test/infrastructure/integration/analytics-tracking.integration.spec.ts` | 139 | POST | `/api/v1/resumes/${resumeId}/analytics/snapshot` | **200** | **201** | explicit |
| `test/infrastructure/integration/resume-import.integration.spec.ts` | 150 | GET | `/api/v1/resumes/imports` | **201** | **200** | default-200 |
| `test/infrastructure/integration/resume-import.integration.spec.ts` | 165 | GET | `/api/v1/resumes/imports` | **201** | **200** | default-200 |
| `test/infrastructure/integration/resume-import.integration.spec.ts` | 192 | GET | `/api/v1/resumes/imports/${createdImportId}` | **201** | **200** | default-200 |
| `test/infrastructure/integration/resume-import.integration.spec.ts` | 216 | POST | `/api/v1/resumes/imports/parse` | **200** | **201** | auto-201-post |
| `test/infrastructure/integration/resume-import.integration.spec.ts` | 284 | POST | `/api/v1/resumes/imports/json` | **200** | **201** | explicit |
| `test/infrastructure/integration/social-features.integration.spec.ts` | 99 | GET | `/api/v1/users/${userBId}/is-following` | **201** | **200** | default-200 |
| `test/infrastructure/integration/resume.integration.spec.ts` | 62 | GET | `/api/v1/resumes` | **201** | **200** | default-200 |
| `test/infrastructure/integration/resume.integration.spec.ts` | 74 | GET | `/api/v1/resumes` | **201** | **200** | default-200 |
| `test/infrastructure/integration/admin-rbac.integration.spec.ts` | 178 | GET | `/api/v1/users/manage` | **201** | **200** | default-200 |
| `test/infrastructure/integration/public-resumes.integration.spec.ts` | 90 | GET | `/api/v1/shares/resume/${resumeId}` | **201** | **200** | default-200 |
| `test/infrastructure/integration/public-resumes.integration.spec.ts` | 100 | GET | `/api/v1/public/resumes/${shareSlug}` | **201** | **200** | default-200 |
| `test/infrastructure/integration/public-resumes.integration.spec.ts` | 151 | DELETE | `/api/v1/shares/${share.id}` | **201** | **200** | default-200 |
| `test/infrastructure/integration/public-resumes.integration.spec.ts` | 191 | GET | `/api/v1/public/resumes/${aliasSlug}` | **201** | **200** | default-200 |
| `test/infrastructure/integration/auth.integration.spec.ts` | 121 | POST | `/api/v1/auth/login` | **201** | **200** | explicit |
| `test/infrastructure/integration/auth.integration.spec.ts` | 165 | POST | `/api/v1/auth/login` | **201** | **200** | explicit |
| `test/infrastructure/integration/auth.integration.spec.ts` | 175 | GET | `/api/v1/users/profile` | **201** | **200** | default-200 |
| `test/infrastructure/integration/generic-sections-extended.integration.spec.ts` | 627 | POST | `/api/v1/resumes/${userAResumeId}/sections/${nonRepeatableSectionTypeKey}/items` | **200** | **201** | explicit |
| `test/infrastructure/integration/auth/2fa-security.integration.spec.ts` | 132 | POST | `/api/v1/auth/login/verify-2fa` | **201** | **200** | explicit |
| `test/infrastructure/integration/auth/2fa-security.integration.spec.ts` | 269 | POST | `/api/v1/auth/login/verify-2fa` | **201** | **200** | explicit |

## Distribuição

| De → Para | Quantidade |
|---|---:|
| 201 → 200 | 17 |
| 200 → 201 | 4 |
