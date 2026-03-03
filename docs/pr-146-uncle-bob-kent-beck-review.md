# PR #146 — Deep Architectural Review

## _"refactor: migrate from legacy section-specific models to unified generic resume sections architecture"_

**Reviewed by:** Robert C. Martin (Uncle Bob) & Kent Beck  
**Date:** 2026-03-02  
**PR Stats:** +21,115 / -15,843 lines | 443 files changed  
**Verdict:** A bold and necessary strategic move, with a half-finished execution that created a _new_ kind of technical debt while eliminating the old one.

---

## Part I — Uncle Bob Speaks

### 1. The Big Picture: What You Got Right

_"Let me start with what's good — and there IS good here."_

**A) The Idea Is Sound — Perhaps Even Brilliant**

The decision to move from 15+ hardcoded section models (`Experience`, `Education`, `Skill`, ...) to a unified `SectionType → ResumeSection → SectionItem` model is _exactly_ the kind of architectural decision that Clean Architecture demands. You identified a fundamental duplication problem — every new section type required a new model, a new controller, a new service, a new repository, new tests. That's shotgun surgery at its worst. And you decided to fix it.

The Prisma schema you landed on is elegant:

```prisma
model SectionType {
  id           String  @id
  key          String  @unique
  definition   Json       // ← THIS is the heart of the idea
  semanticKind String
  ...
}
model ResumeSection { ... }
model SectionItem {
  content Json            // ← Schema-validated via definition
}
```

This is the **Open/Closed Principle** done right at the data model level. New section types require zero code changes — just a new seed row. That's powerful. That's what software SHOULD be.

**B) The Composition Root Pattern**

Your `generic-resume-sections.composition.ts` is one of the best things in this PR. You've created a pure function that wires use cases, policies, and repositories without NestJS decorators:

```typescript
export function buildGenericResumeSectionsUseCases(
  prisma: PrismaService,
  sectionSchemaFactory: SectionDefinitionZodFactory,
): GenericResumeSectionsUseCases {
  const repository = new GenericResumeSectionsRepository(prisma);
  const ownershipPolicy = new ResumeOwnershipPolicy(repository);
  ...
}
```

This is Clean Architecture — the framework (NestJS) stays at the outermost ring. The composition root assembles plain classes. **This is excellent.** Keep doing this.

**C) The Policy Objects**

`ResumeOwnershipPolicy`, `ItemContentValidatorPolicy`, `ItemLimitPolicy`, `OrderingPolicy`, `SectionTypePolicy` — these are small, focused, single-responsibility classes. Each has ONE reason to change. Each can be tested in isolation. This is what I teach.

**D) Dynamic Validation via `SectionDefinitionZodFactory`**

Building Zod schemas dynamically from JSON field definitions stored in the database? That's creative. It means the _database_ defines what's valid, not the code. This is your best architectural decision.

**E) Architecture Tests**

The `generic-sections-guardrail.architecture.ts` is exactly the kind of test that should exist. You're testing the architecture itself — ensuring legacy Prisma models don't creep back in. This shows professional discipline.

---

### 2. Where the Execution Fails — And Why It Matters

_"Now... let me be direct. Because being kind without being honest isn't kindness at all."_

#### 2.1 THE FUNDAMENTAL CONTRADICTION: "Dynamic" System With Hardcoded Rules

**This is the elephant in the room.** And you already feel it — you said it yourself.

You built a beautiful dynamic section system where types are defined in the database... and then you wrote this:

```typescript
// education-scoring.strategy.ts
export class EducationScoringStrategy implements SemanticScoringStrategy {
  readonly kind = 'EDUCATION' as const;

  score(item: SemanticSectionItem): number {
    let score = 35;
    if (this.organizationExtractor.extractPrimary(item.values)) score += 20;
    const degree = item.values.find(v => v.role === 'DEGREE')?.value;
    if (typeof degree === 'string' && degree.trim().length > 0) score += 25;
    ...
  }
}
```

And this:

```typescript
// work-experience-scoring.strategy.ts
export class WorkExperienceScoringStrategy implements SemanticScoringStrategy {
  readonly kind = 'WORK_EXPERIENCE' as const;
  ...
}
```

And this:

```typescript
// certification-scoring.strategy.ts
export class CertificationScoringStrategy implements SemanticScoringStrategy {
  readonly kind = 'CERTIFICATION' as const;
  ...
}
```

And this:

```typescript
// mandatory-semantic.policy.ts
private readonly mandatoryKinds: SectionKind[] = [
  'WORK_EXPERIENCE', 'EDUCATION', 'SKILL_SET'
];
```

And this:

```typescript
// section-order-semantic.policy.ts
private readonly recommendedOrder: SectionKind[] = [
  'PERSONAL_INFO', 'SUMMARY', 'WORK_EXPERIENCE', 'EDUCATION',
  'SKILL_SET', 'CERTIFICATION', 'PROJECT', 'AWARD', ...
];
```

And the 791-line `section-projection.adapter.ts`:

```typescript
export function projectExperience(item: GenericSectionItem): ExperienceProjection { ... }
export function projectEducation(item: GenericSectionItem): EducationProjection { ... }
export function projectSkill(item: GenericSectionItem): SkillProjection { ... }
export function projectLanguage(item: GenericSectionItem): LanguageProjection { ... }
// ... 12 more projection functions
// ... 12 more JSON Resume conversion functions
// ... a SectionProjectionAdapter object with 12 more methods
```

**Do you see what happened?**

You eliminated 15 Prisma models and 15 controllers... then you rebuilt the same per-section-type knowledge scattered across:

- 3 scoring strategies (hardcoded per kind)
- 2 semantic policies (hardcoded kind lists)
- 12 projection functions (hardcoded per kind)
- 12 JSON Resume converters (hardcoded per kind)
- A switch statement in the DSL compiler (hardcoded per sectionId)
- A SemanticKind union type (hardcoded 16 kinds)
- A seed file with 7 exhaustive definitions

**You didn't eliminate the coupling. You moved it.** From 15 Prisma models to 15 projection functions. From 15 controllers to one `switch` statement with 12 cases. The shape of the duplication changed, but the duplication REMAINED.

_"Clean code always looks like it was written by someone who cares. But caring isn't enough if you're solving the wrong problem."_

**The right solution**: Scoring rules, mandatory-ness, recommended ordering, projection mappings — ALL of this should be data-driven, defined alongside the `SectionType` definition in the database. The code should be 100% generic.

#### 2.2 The `SemanticKind` Union Type — A Compile-Time Lie

```typescript
export type SemanticKind =
  | 'WORK_EXPERIENCE'
  | 'EDUCATION'
  | 'SKILL_SET'
  | 'LANGUAGE'
  | 'PROJECT'
  | 'CERTIFICATION'
  | 'AWARD'
  | 'INTEREST'
  | 'RECOMMENDATION'
  | 'PUBLICATION'
  | 'SUMMARY'
  | 'ACHIEVEMENT'
  | 'TALK'
  | 'HACKATHON'
  | 'BUG_BOUNTY'
  | 'OPEN_SOURCE'
  | 'CUSTOM';
```

If section types are truly dynamic and database-driven, why does the code need a compile-time list of all possible kinds? Every time a user creates a custom section type, this union is a lie. Your `SectionKindSchema` in the semantic DTOs already does the right thing:

```typescript
export const SectionKindSchema = z.string().min(1);
```

This accepts ANY string. But then the `generic-section.types.ts` constrains it back to a hardcoded union. These two contracts are at war with each other.

**Fix:** Kill the `SemanticKind` union type. Use `string` everywhere. The database is the source of truth, not TypeScript literals.

#### 2.3 The 791-Line `section-projection.adapter.ts` — G5 Duplication on Steroids

This file is a **code smell dumpster fire.** I say this with love.

791 lines. 12 projection interfaces. 12 projection functions. 12 JSON Resume converters. A `SectionProjectionAdapter` object that wraps them all. And a `projectResumeSections` function with a hardcoded `ResumeProjection` interface listing every section type.

This file violates:

- **SRP**: It has at LEAST 12 reasons to change (one per section type)
- **OCP**: Adding a new section type requires modifying this file in 4+ places
- **G5 (Duplication)**: Every projection function follows the same pattern — extract fields from `content` by key name. The ONLY difference is WHICH keys they extract.
- **F3 (Flag Arguments)**: The `projectItemsByKind` is basically a dispatcher masquerading as a generic function

What this file SHOULD be:

```typescript
// This is all you need. One function. Zero per-type knowledge.
function projectItem(
  item: GenericSectionItem,
  definition: SectionDefinition,
): Record<string, unknown> {
  const result: Record<string, unknown> = { id: item.id, order: item.order };
  for (const field of definition.fields) {
    result[field.key] = extractField(item.content, field);
  }
  return result;
}
```

The `SectionType.definition` already contains everything needed to project items. The field names, the types, the required-ness. You don't need `projectExperience()` or `projectEducation()` — you need ONE projection function that reads the definition.

#### 2.4 The DSL Compiler's Switch Statement — The Anti-Pattern That Screams

```typescript
private compileSectionData(sectionId: string, resume: GenericResume, ...): SectionData {
  switch (sectionId) {
    case 'experience': return this.compileExperiences(resume.sections, overrides);
    case 'education':  return this.compileEducation(resume.sections, overrides);
    case 'skills':     return this.compileSkills(resume.sections, overrides);
    case 'languages':  return this.compileLanguages(resume.sections, overrides);
    case 'projects':   return this.compileProjects(resume.sections, overrides);
    // ... 7 more cases
    default:           return getPlaceholderData(sectionId);
  }
}
```

_"Switch statements cry out for polymorphism."_ — That's Heuristic G23 from Clean Code.

But more importantly: you have a **dynamic** section type system. The DSL compiler should NOT need to know what section types exist. It should compile ANY section type generically by reading the definition from the database.

This switch is proof that the migration is half-done. The database says "I'm dynamic." The code says "No, you're one of these 12 things."

#### 2.5 The Onboarding Services — Why Do They Exist?

```typescript
export class EducationOnboardingService extends BaseOnboardingService<...> {
  private static readonly SECTION_TYPE_KEY = 'education_v1';
  ...
}

export class ExperienceOnboardingService extends BaseOnboardingService<...> {
  private static readonly SECTION_TYPE_KEY = 'work_experience_v1';
  ...
}
```

You have a `BaseOnboardingService` with a template method pattern. Good. But then you have 4+ concrete implementations that are nearly identical except for:

1. The section type key
2. The field mapping function

This IS the duplication the generic system was supposed to eliminate. These services should be ONE service parameterized by section type key:

```typescript
class GenericOnboardingService {
  async saveItems(
    tx,
    resumeId,
    sectionTypeKey,
    items: Prisma.InputJsonValue[],
  ) {
    await this.resumeSectionService.replaceSectionItems(tx, {
      resumeId,
      sectionTypeKey,
      items,
    });
  }
}
```

The mapping from onboarding form data to section item content should be done at the controller/DTO layer, not in per-type service classes.

---

### 3. SOLID Analysis

| Principle | Grade | Assessment                                                                                                                                                                                                  |
| --------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SRP**   | C+    | Generic sections core: A. Scoring strategies, projection adapter, DSL compiler: F. They each know about specific section types.                                                                             |
| **OCP**   | D     | The system is CLOSED to modification at the database level (new SectionType = no schema changes). But it's OPEN to modification in 6+ code files whenever a new section kind is added. Half OCP.            |
| **LSP**   | B     | The scoring strategies correctly implement the `SemanticScoringStrategy` interface. The `DefaultScoringStrategy` handles unknown kinds. Solid.                                                              |
| **ISP**   | B+    | The `GenericResumeSectionsRepositoryPort` is well-segregated. The `SectionSemanticCatalogPort` is minimal. Good.                                                                                            |
| **DIP**   | A-    | Dependencies point inward. Use cases depend on ports, not implementations. The composition root injects everything. The ONLY violation is `PrismaService` leaking into the `SectionSemanticCatalogAdapter`. |

**Overall SOLID Score: C+**

The core domain is well-structured. The boundaries (ATS, DSL, Export, Onboarding) are where SOLID breaks down because they rebuild per-type knowledge that should be data-driven.

---

### 4. Architecture Decision: What Should Actually Happen

_"Good architecture maximizes decisions NOT made."_

Here's the architecture your IDEA demands but your EXECUTION didn't deliver:

#### 4.1 The `SectionType.definition` Should Drive EVERYTHING

The `definition` JSON in your seed already contains:

- Field names and types
- Required/optional modifiers
- Semantic roles (`ORGANIZATION`, `JOB_TITLE`, `DEGREE`, etc.)
- Validation constraints (min/max length, enum values)
- UI metadata (widget type, labels)

What it DOESN'T contain but SHOULD:

- **Scoring rules** (weights per semantic role)
- **ATS mandatory flag** (is this section type required for ATS?)
- **Recommended display order** (for ATS ordering policy)
- **Projection format** (how to map to JSON Resume, DOCX, etc.)

Example of what the definition SHOULD look like:

```json
{
  "schemaVersion": 2,
  "kind": "EDUCATION",
  "fields": [ ... ],
  "ats": {
    "isMandatory": true,
    "recommendedPosition": 4,
    "scoring": {
      "baseScore": 35,
      "fieldWeights": {
        "ORGANIZATION": 20,
        "DEGREE": 25,
        "START_DATE": 10,
        "END_DATE": 10
      }
    }
  },
  "export": {
    "jsonResume": {
      "mapping": {
        "institution": "$.institution",
        "area": "$.field",
        "studyType": "$.degree",
        "startDate": "$.startDate",
        "endDate": "$.endDate"
      }
    }
  }
}
```

With this, you need ZERO scoring strategies, ZERO projection functions, ZERO switch statements. The code is:

```typescript
// One generic scoring function
function scoreItem(item: SectionItem, definition: SectionDefinition): number {
  const ats = definition.ats;
  let score = ats.scoring.baseScore;
  for (const [role, weight] of Object.entries(ats.scoring.fieldWeights)) {
    if (item.values.some((v) => v.role === role && hasContent(v.value))) {
      score += weight;
    }
  }
  return Math.min(100, score);
}
```

ONE function. Works for every section type. Now and forever.

#### 4.2 Kill the Projection Layer (Almost Entirely)

The `section-projection.adapter.ts` with its 791 lines exists because the downstream consumers (DSL, Export, Analytics) still expect typed projections. But why?

If the DSL compiler receives a generic `SectionItem` with a `content` JSON and a `SectionType.definition` that describes the fields, it can render ANY section type without knowing what it is. The template engine should iterate over fields from the definition, not switch on section kind.

The ONLY legitimate reason for typed projections is external contract compatibility (JSON Resume spec, DOCX builders). And even those can be driven by a mapping definition in the database.

#### 4.3 The Endgame Architecture

```
┌─────────────────────────────────────────────────┐
│               SectionType (DB)                  │
│  definition: { fields, ats, export, ui }        │
│  ← ALL behavior rules defined HERE              │
└─────────────────┬───────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
 Generic       Generic       Generic
 Scorer        Compiler      Exporter
 (reads def)   (reads def)   (reads def)
    │             │             │
    ▼             ▼             ▼
 ATS Score     Resume AST   JSON/DOCX/PDF
```

No per-type strategies. No per-type projections. No per-type compilers. One generic engine per concern, parameterized by the definition.

---

### 5. Code Smell Catalog

| Smell                                    | Location                                                                                      | Severity |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- | -------- |
| **G5: Duplication**                      | 12 projection functions doing the same "extract from content" pattern                         | CRITICAL |
| **G5: Duplication**                      | 4+ onboarding services differing only by section type key                                     | HIGH     |
| **G23: Switch over polymorphism**        | DSL compiler switch on sectionId (12 cases)                                                   | HIGH     |
| **G30: Functions doing multiple things** | `section-projection.adapter.ts` (791 lines!) — projection + conversion + analytics + counting | CRITICAL |
| **F1: Too many arguments**               | Some use case constructors take 4+ dependencies                                               | MEDIUM   |
| **G2: Obvious behavior NOT implemented** | Custom section types would require code changes despite "dynamic" system claim                | HIGH     |
| **C5: Commented-out code**               | N/A (good — clean in this regard)                                                             | —        |
| **G9: Dead code**                        | Legacy repositories/services/controllers deleted (good!)                                      | —        |

---

## Part II — Kent Beck Speaks

_"Hmm... that's interesting. Let me think about this differently."_

### 6. What I See Through the Lens of Simplicity

Uncle Bob is right about the contradictions. But let me ask a different question: **Why did this happen?**

I think I know. And it's not because you're a bad developer. It's because you tried to do _too much at once_.

443 files. 21,000 additions. One PR.

_"If it scares you, make it smaller. If it still scares you, smaller still."_

This PR should have been 5-8 separate PRs:

1. **PR 1:** Schema migration only (`SectionType`, `ResumeSection`, `SectionItem`) with seed data
2. **PR 2:** Generic CRUD (controller, service, use cases, policies) — the core that works beautifully
3. **PR 3:** Migrate ONE consumer (e.g., onboarding) to use generic sections
4. **PR 4:** Migrate another consumer (e.g., DSL compiler)
5. **PR 5:** Migrate exports
6. **PR 6:** Migrate ATS validation
7. **PR 7:** Delete legacy models and clean up
8. **PR 8:** CI workflow separation (unrelated — should never be in the same PR)

By doing it all at once, you lost the ability to:

- Get feedback after each step
- Catch the contradictions early (you'd have noticed the projection duplication by PR 4)
- Maintain a green-to-green migration path
- Roll back safely if something breaks

_"Fast feedback is oxygen. You held your breath for 441 files."_

### 7. Make It Work, Make It Right, Make It Fast

Your PR is at "Make It Work" — and BARELY. Let me explain:

**Make It Work ✓ (mostly)**
The generic sections CRUD works. The schema is correct. Items can be created, updated, deleted. Validation is dynamic. This IS working.

**Make It Right ✗ (not yet)**
The "right" version doesn't have switch statements that enumerate section types. The "right" version has ONE generic projection function. The "right" version doesn't need `EducationScoringStrategy` or `WorkExperienceScoringStrategy` because scoring rules are in the database.

You're in the uncomfortable middle. The old system was WRONG but CONSISTENT. The new system is STRATEGICALLY RIGHT but TACTICALLY INCONSISTENT. And inconsistency is more dangerous than wrongness, because it confuses the team about what "right" looks like.

**Make It Fast — Not even a consideration yet**
Performance optimization should wait. But I'd note that loading `SectionType.definition` on every request could benefit from caching if you go fully data-driven.

### 8. The Three Strikes Rule Applied Here

_"First time you write duplicate code: okay. You're learning. Second time: note it. Third time: REFACTOR."_

How many times did you write "extract field X from content by key string"?

- `projectExperience`: `getStringRequired(content, 'company')`, `getStringRequired(content, 'role')`
- `projectEducation`: `getStringRequired(content, 'institution')`, `getStringRequired(content, 'degree')`
- `projectSkill`: `getStringRequired(content, 'name')`, `getNumber(content, 'level')`
- ... 9 more times.

That's not strike three. That's strike **twelve**. The pattern is SCREAMING at you:

```
"For each field in definition, extract it from content by its key."
```

That's the abstraction. That's what `projectItem()` should do. And you had ALL the information to do it, because the `SectionType.definition.fields` array contains every key name and type.

### 9. What I Love About Your Instinct

Here's what I want to acknowledge, because it matters:

**You saw the problem CLEARLY.** You said: _"eu queria algo COMPLETAMENTE dinamico, nao queria definir aqui as regras de cada secao."_

You're RIGHT. Your instinct is correct. The idea IS that nothing section-specific should exist in code. The database should define everything.

The gap between your vision and your execution is NOT a gap of understanding — it's a gap of incremental discipline. You tried to get to the endgame in one leap. And halfway through, the pragmatic gravity of "I need this to work NOW" pulled you back into hardcoding things.

That's human. It happens to everyone. It happened to me on the C3 project.

The cure is: **go back and make it right. Incrementally.**

---

## Part III — Joint Recommendations

### 10. Priority Matrix: What To Fix and When

#### P0 — Before Merging This PR

| #   | Action                                                                   | Why                                                                                                                                                            |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Split the CI workflow changes into a separate PR**                     | Unrelated to generic sections. SRP applies to PRs too.                                                                                                         |
| 2   | **Add the `ats` and `export` configuration to `SectionType.definition`** | This is the keystone fix. Scoring rules, mandatory flags, recommended order, export mappings — all move to the database.                                       |
| 3   | **Replace scoring strategies with one generic scorer**                   | Delete `EducationScoringStrategy`, `WorkExperienceScoringStrategy`, `CertificationScoringStrategy`. Write ONE `GenericScoringService.score(item, definition)`. |
| 4   | **Replace `MandatorySemanticPolicy` hardcoded list with DB query**       | `SELECT key FROM section_type WHERE definition->'ats'->'isMandatory' = true`                                                                                   |
| 5   | **Replace `SectionOrderSemanticPolicy` hardcoded list with DB query**    | `SELECT key FROM section_type ORDER BY definition->'ats'->'recommendedPosition'`                                                                               |

#### P1 — Next Sprint

| #   | Action                                                                                | Why                                                                                            |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 6   | **Replace `section-projection.adapter.ts` with definition-driven generic projection** | Kill 791 lines. Replace with ~50 lines of generic field extraction.                            |
| 7   | **Replace DSL compiler switch with definition-driven section rendering**              | The compiler should NOT know what section types exist.                                         |
| 8   | **Merge onboarding services into one generic onboarding service**                     | `EducationOnboardingService`, `ExperienceOnboardingService`, etc. → `GenericOnboardingService` |
| 9   | **Kill the `SemanticKind` union type**                                                | Replace with `string`. The database defines valid kinds, not TypeScript.                       |

#### P2 — Controlled Refactor

| #   | Action                                                  | Why                                                                                              |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 10  | **Migrate GraphQL schema to generic section mutations** | Remove `addExperience`, `addEducation` mutations. Use `addSectionItem(sectionTypeKey, content)`. |
| 11  | **Migrate shared-kernel contracts**                     | Remove `CreateResumeSchema` legacy bucket fields.                                                |
| 12  | **Add export mapping to SectionType definition**        | JSON Resume, DOCX, LaTeX mappings all become data-defined.                                       |

### 11. The Definition Schema v2 Proposal

```typescript
interface SectionTypeDefinitionV2 {
  schemaVersion: 2;
  kind: string; // NOT a union type — any string

  fields: SectionFieldDefinition[];

  ats?: {
    isMandatory: boolean;
    recommendedPosition: number; // 1-based order
    scoring: {
      baseScore: number; // 0-100
      fieldWeights: Record<string, number>; // semanticRole → weight
    };
  };

  export?: {
    jsonResume?: {
      targetSection: string; // "work", "education", "skills", etc.
      mapping: Record<string, string>; // jsonResumeField → contentFieldKey
    };
  };

  ui?: {
    icon?: string;
    color?: string;
    defaultTitle?: string;
  };

  constraints?: {
    allowsMultipleItems?: boolean;
    minItems?: number;
    maxItems?: number;
  };
}
```

With this schema, your ENTIRE scoring engine becomes:

```typescript
function scoreItem(
  item: SectionItem,
  definition: SectionTypeDefinitionV2,
): number {
  if (!definition.ats?.scoring) return 50; // No scoring rules = neutral

  const { baseScore, fieldWeights } = definition.ats.scoring;
  let score = baseScore;

  for (const [role, weight] of Object.entries(fieldWeights)) {
    const hasValue = item.values.some(
      (v) => v.role === role && isNonEmpty(v.value),
    );
    if (hasValue) score += weight;
  }

  return Math.min(100, score);
}
```

15 lines. Works for EVERY section type. Forever.

### 12. The Test Gap

**Uncle Bob:** Your architecture tests are good. Your unit tests for the scoring strategies and policies exist. But you're missing:

1. **Contract tests** — Ensure the generic system produces the SAME output as the legacy system for existing section types. This is your migration safety net.
2. **Property-based tests** — Given ANY valid `SectionType.definition` and ANY valid `SectionItem.content`, the projection/scoring/export should never crash. Use fast-check or similar.
3. **Integration tests for the full pipeline** — `SectionType seed → create item → compile DSL → export JSON` end-to-end.

**Kent Beck:** Before you refactor the scoring/projection layer, write characterization tests. Test what it DOES now, not what it SHOULD do. Then refactor, keeping all characterization tests green. Inch by inch.

---

## Part IV — Summary

### What You Got Right (The A-Grade Work)

1. **The data model** — `SectionType → ResumeSection → SectionItem` is architecturally correct
2. **Dynamic validation** — `SectionDefinitionZodFactory` building Zod schemas from DB definitions
3. **Composition root** — Clean, framework-independent use case assembly
4. **Policy objects** — Small, focused, testable domain policies
5. **Architecture guardrail tests** — Preventing legacy model regression
6. **Elimination of 15+ legacy models, controllers, services** — Massive deduplication
7. **The `SectionSemanticCatalogAdapter`** — Clean port/adapter for ATS boundary

### What You Got Wrong (The Execution Gaps)

1. **Scoring strategies are hardcoded per section type** — Should be data-driven from definition
2. **Projection functions are hardcoded per section type** — Should be generic field extraction
3. **DSL compiler has a 12-case switch** — Should be definition-driven
4. **Onboarding services are duplicated per section type** — Should be one generic service
5. **`SemanticKind` union type contradicts the dynamic system** — Should be `string`
6. **Mandatory/ordering policies have hardcoded kind lists** — Should be DB-queries
7. **791-line adapter file** — Should be ~50 lines of generic logic
8. **One massive PR (443 files)** — Should have been 5-8 incremental PRs
9. **CI changes mixed with domain refactor** — Violates SRP at the PR level

### The Bottom Line

**Uncle Bob:** _"The idea is A+. The execution is C+. You created a dynamic system and then hardcoded everything around it. But here's the thing — you KNOW this. You feel it. The discomfort you're experiencing IS the code telling you what's wrong. Listen to it. The only way to go fast... is to go well."_

**Kent Beck:** _"I wonder... what would happen if you took just ONE section type — let's say Education — and made it truly, completely, 100% data-driven end-to-end? Scoring from definition. Projection from definition. Export from definition. DSL compilation from definition. If you can make ONE section type fully dynamic, the rest will follow. Start small. Make it work. Then make it right."_

---

## Appendix A — Files That Need The Most Attention

| File                                  | Issue                                                | Lines |
| ------------------------------------- | ---------------------------------------------------- | ----- |
| `section-projection.adapter.ts`       | 12 hardcoded projections + 12 JSON Resume converters | 791   |
| `dsl-compiler.service.ts`             | 12-case switch statement on section ID               | ~275  |
| `education-scoring.strategy.ts`       | Hardcoded kind + field knowledge                     | 38    |
| `work-experience-scoring.strategy.ts` | Hardcoded kind + field knowledge                     | 43    |
| `certification-scoring.strategy.ts`   | Hardcoded kind + field knowledge                     | 31    |
| `mandatory-semantic.policy.ts`        | Hardcoded mandatoryKinds array                       | 48    |
| `section-order-semantic.policy.ts`    | Hardcoded recommendedOrder array                     | 86    |
| `generic-section.types.ts`            | Hardcoded SemanticKind union type                    | 110   |
| `education-onboarding.service.ts`     | Per-type service that should be generic              | 90    |
| `experience-onboarding.service.ts`    | Per-type service that should be generic              | 90    |

## Appendix B — The One Rule

If you remember one thing from this review, remember this:

> **If the `SectionType.definition` JSON doesn't contain the rules, the system isn't dynamic. It's a string-based enum with extra steps.**

Make the definition the SINGLE source of behavioral truth. Everything else follows.

---

_Review ends. Go make it right. — RCM & KB_
