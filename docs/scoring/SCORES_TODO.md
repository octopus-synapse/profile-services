# Scoring Subsystem — Post-MVP Followups

Deferred work that was considered during the initial design but intentionally kept out of the first ship. Each item has a rationale for why it's not in v1 and enough context to pick it up later.

## Similarity math — Mahalanobis / learned weights

**Current (MVP):** weighted cosine similarity for User↔Company and User↔Job matching.

- Pro: simple, auditable, explainable to stakeholders
- Con: assumes independence between Big Five / Schwartz / SDT dimensions; ignores correlations

**Followup:** Mahalanobis distance (accounts for covariance between dimensions) or distance learned by gradient descent from historical hire/interview outcomes.

**Trigger to revisit:** when we have ≥10k `FitRemapHistory` snapshots tied to interview outcomes and can supervise a regression.

---

## Item Response Theory (IRT) adaptive questionnaire

**Current (MVP):** stratified random sampling of 25 questions from a pool of 100, 5 per dimension.

- Pro: deterministic, easy to audit, idempotent per user seed
- Con: all users answer the same dimension breadth regardless of their position on each axis

**Followup:** IRT-style adaptive questionnaire — each question's difficulty/discrimination parameter is learned; the next question is chosen to minimize the posterior variance of the user's latent trait estimates. Often converges in half the items.

**Trigger to revisit:** if user drop-off on question 15+ is >20%, or a psychometrician joins the team.

---

## Company Culture Profile from public data

**Current (MVP):** internal Patch jobs — recruiter optionally fills sliders. External jobs — no company culture modeled at all, only User↔Job via recruiter-filled sliders for that job.

- Pro: zero IA cost, no data-quality risk at launch
- Con: blind to culture for the long tail of external companies

**Followup:** IA adapter that ingests public signals (company website "about us", Glassdoor reviews, job descriptions across multiple roles at the same company) and outputs a `CompanyCultureProfile` vector. Needs a human approval step and versioning.

**Trigger to revisit:** once ≥50 companies have internal sliders filled, we have ground truth to validate IA-derived profiles against.

---

## Company-scoped recruiter roles

**Current (MVP):** a `role_recruiter` role exists but is global — a recruiter can edit any job in the system if granted the role. OK for early-stage when the only recruiters are Patch staff.

**Followup:** multi-tenant scoping — a user may have `role_recruiter` inside Company A and no permission in Company B. Requires:
- A `CompanyMembership` table (userId × companyId × role)
- Middleware that resolves the tenant from the request path or body
- Per-tenant audit logs

**Trigger to revisit:** first external company recruiter onboards to the platform.

---

## MinIO cache for rendered PDFs

**Current (MVP):** every PDF request spawns a Typst CLI subprocess. Cached for 5 min in memory (client-side). Re-renders on every fresh page load.

**Followup:** content-addressable cache in MinIO — key is `sha256(ResumeAst)`. Hit → stream from MinIO. Miss → render, upload, stream. Invalidation is automatic (new AST hash = new object).

**Trigger to revisit:** when P95 of `/v1/export/resume/pdf` exceeds ~3s, or Typst CPU tops machine utilization charts.

---

## Client-side Typst WASM preview

**Current (MVP):** preview PDFs are backend-rendered; UI embeds `<iframe>` or pdf.js.

**Followup:** ship `typst.ts` WASM to the browser and expose `GET /v1/resumes/:id/ast` so the client can render locally. Zero backend CPU per preview at the cost of ~3 MB WASM bundle.

**Trigger to revisit:** if preview scroll/change is a bottleneck on the frontend, or if offline preview becomes a product requirement.

---

## Per-plan AI rate limits

**Current (MVP):** no rate limits on AI calls (Content Quality, Match Semantic, etc.). Cost tracked in structured logs so we can observe.

**Followup:** per-plan quotas (free, paid) and per-user daily caps once we have a second plan tier.

**Trigger to revisit:** when OpenAI bill exceeds budget, or when a free tier is introduced.

---

## Progress history & delta UX on the frontend

Backend already keeps `ResumeQualityScoreHistory` (append-only). Frontend can surface a line chart of score over time and "+6 pts since last session" nudges — this is already unblocked, just not yet built.

---

## ScoreComputed event → webhook fan-out

Backend emits `ScoreComputed` events internally via BullMQ. Post-MVP we may expose these as outbound webhooks for enterprise customers (ATS integrations, BI tools, etc.).
