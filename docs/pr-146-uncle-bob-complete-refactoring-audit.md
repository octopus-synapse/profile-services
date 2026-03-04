# PR-146: Uncle Bob's Complete Generic Resume Sections Refactoring Audit

_Hmm, let me think about this..._

You asked me to assume the persona of Uncle Bob, and you want a **complete refactoring audit** for your generic resume sections migration. You've made it clear: **no backward compatibility**, **big bang refactoring**, and you want me to identify **everything** that's still using the legacy section-specific patterns.

Let me deconstruct this...

---

## Executive Summary: The State of Affairs

**Current PR Status:**

- +42,494 / -26,297 lines (878 files changed)
- Major architectural shift from legacy bucket arrays to generic sections
- **BUT**: The migration is incomplete. The codebase still carries significant technical debt.

**My Verdict:** Execution grade: **4/10**. The vision is correct, but the implementation stopped halfway. You've created a good generic sections model, but then you've layered backward-compatibility adapters that preserve all the legacy knowledge. **That's not clean architecture—that's putting lipstick on a pig.**

---

## Part 1: Files to DELETE Immediately (Useless Legacy Files)

### 1.1 Section-Specific Schemas (COMPLETE WASTE)

```
src/shared-kernel/schemas/resume/sections/
├── award.schema.ts          ❌ DELETE
├── bug-bounty.schema.ts     ❌ DELETE
├── certification.schema.ts  ❌ DELETE
├── education.schema.ts      ❌ DELETE
├── experience.schema.ts     ❌ DELETE
├── hackathon.schema.ts      ❌ DELETE
├── interest.schema.ts       ❌ DELETE
├── language.schema.ts       ❌ DELETE
├── open-source.schema.ts    ❌ DELETE
├── project.schema.ts        ❌ DELETE
├── publication.schema.ts    ❌ DELETE
├── recommendation.schema.ts ❌ DELETE
├── skill.schema.ts          ❌ DELETE
├── talk.schema.ts           ❌ DELETE
```

**Why these are useless:**
These files define Zod validation schemas for each section type. But you already have `SectionDefinitionZodFactory` that dynamically builds schemas from the `SectionType.definition.fields` stored in the database!

The code should NOT know what an "experience" is. It should NOT know what "education" fields look like. All validation comes from the SectionType definition.

**The only schema the code needs:**

```typescript
// This already exists and works
class SectionDefinitionZodFactory {
  buildSchema(definition: SectionDefinition): ZodType;
}
```

---

### 1.2 Section-Specific Onboarding Services (REDUNDANT)

```
src/bounded-contexts/onboarding/onboarding/services/
├── education-onboarding.service.ts      ❌ DELETE
├── education-onboarding.service.spec.ts ❌ DELETE
├── experience-onboarding.service.ts     ❌ DELETE
├── experience-onboarding.service.spec.ts❌ DELETE
├── skills-onboarding.service.ts         ❌ DELETE
├── skills-onboarding.service.spec.ts    ❌ DELETE
├── languages-onboarding.service.ts      ❌ DELETE
├── languages-onboarding.service.spec.ts ❌ DELETE
```

**Why these are useless:**
You have `resume-section-onboarding.service.ts` which should handle ALL section types generically. The onboarding flow should:

1. Get section types from DB
2. Validate input against `SectionType.definition`
3. Create generic section items

**The onboarding code should NOT know about "experience", "education", etc.**

---

### 1.3 DSL AST Section-Data Schemas (LEGACY CANCER)

```
src/shared-kernel/ast/section-data.schema.ts
```

This file contains:

```typescript
export const ExperienceItemSchema = z.object({...});
export const EducationItemSchema = z.object({...});
export const SkillItemSchema = z.object({...});
export const ProjectItemSchema = z.object({...});
// ...15 more type-specific schemas
```

**This is the exact opposite of generic sections!**

The DSL AST should work with:

```typescript
export const GenericSectionDataSchema = z.object({
  type: z.string(), // Section type key
  items: z.array(
    z.object({
      content: z.record(z.unknown()),
    }),
  ),
});
```

The validation for each section type comes from `SectionType.definition.fields`—NOT from hardcoded schemas.

---

### 1.4 Export Builders (TYPE-SPECIFIC CANCER)

```
src/bounded-contexts/export/export/builders/
├── docx-education.builder.ts    ❌ DELETE
├── docx-experience.builder.ts   ❌ DELETE
├── docx-project.builder.ts      ❌ DELETE
├── docx-skills.builder.ts       ❌ DELETE
```

**Why these are useless:**
Each section type's export mapping should come from `SectionType.definition.export.fieldMapping`. The export builder should be GENERIC:

```typescript
class GenericDocxSectionBuilder {
  buildSection(
    section: GenericResumeSection,
    sectionType: SectionType,
  ): Paragraph[] {
    const mapping = sectionType.definition.export.fieldMapping;
    // Generic field extraction using mapping
  }
}
```

---

## Part 2: Files that Need COMPLETE Refactoring

### 2.1 SectionProjectionAdapter (BACKWARD COMPAT BLOAT)

**File:** `src/shared-kernel/types/section-projection.adapter.ts` (866 lines!)

This file is a monument to backward compatibility—and it needs to DIE.

**What it does:**

```typescript
// 866 lines of projection logic for EACH section type!
export const SectionProjectionAdapter = {
  projectExperience(sections),
  projectEducation(sections),
  projectSkills(sections),
  projectLanguages(sections),
  projectProjects(sections),
  // ...15 more projection methods
}
```

**What it SHOULD be:**

```typescript
export function projectSection(
  section: GenericResumeSection,
  fieldMapping?: Record<string, string>,
): ProjectedSection {
  // Generic projection using content keys
}
```

The consuming code extracts fields by KEY, not by knowing "this is an experience section".

---

### 2.2 ATS Validation (HARDCODED SECTION KNOWLEDGE)

#### Problem File 1: `content-quality-semantic.policy.ts`

```typescript
// HARDCODED SECTION KNOWLEDGE - WRONG!
private readonly requiredRolesByKind: Partial<Record<SectionKind, string[]>> = {
  WORK_EXPERIENCE: ['ORGANIZATION', 'JOB_TITLE'],
  EDUCATION: ['ORGANIZATION', 'DEGREE'],
  CERTIFICATION: ['TITLE', 'ORGANIZATION'],
};
```

**Should come from:**

```typescript
// SectionType definition in DB
{
  ats: {
    scoring: {
      fieldWeights: {
        organization: 25,  // If missing, deduct 25 points
        title: 20,
        description: 15
      }
    }
  }
}
```

#### Problem File 2: `mandatory-semantic.policy.ts`

The mandatory sections check should read from `SectionType.definition.ats.isMandatory`, NOT from hardcoded lists.

#### Problem File 3: `section-order-semantic.policy.ts`

```typescript
// HARDCODED ORDER KNOWLEDGE - WRONG!
private checkExperienceBeforeEducation(order: string[], issues: ValidationIssue[]): void {
  const experienceIndex = order.indexOf('WORK_EXPERIENCE');
  const educationIndex = order.indexOf('EDUCATION');
  // ...
}
```

**Should come from:**

```typescript
// SectionType definition in DB
{
  ats: {
    recommendedPosition: 1; // WORK_EXPERIENCE should be first
  }
}
```

#### Problem File 4: `cv-section.parser.ts`

```typescript
// HARDCODED SECTION DETECTION - WRONG!
[CVSectionType.EXPERIENCE]: {
  keywords: ['experience', 'employment', 'work', 'career', 'history'],
  multiWord: ['work experience', 'professional experience', ...],
}
```

This should be loaded from SectionType definition's metadata, not hardcoded.

---

### 2.3 Prisma Schema (HARDCODED SECTION COUNTS)

**File:** `prisma/schema/analytics-projection.prisma`

```prisma
model AnalyticsResumeProjection {
  experiencesCount     Int @default(0)
  educationCount       Int @default(0)
  skillsCount          Int @default(0)
  certificationsCount  Int @default(0)
  projectsCount        Int @default(0)
  awardsCount          Int @default(0)
  languagesCount       Int @default(0)
  interestsCount       Int @default(0)
  // ...15 hardcoded columns!!!
}
```

**Should be:**

```prisma
model AnalyticsResumeProjection {
  sectionCounts Json  // { "work_experience_v1": 3, "education_v1": 2, ... }
}
```

Or better—a normalized table:

```prisma
model AnalyticsSectionCount {
  projectionId String
  sectionTypeKey String
  count Int
}
```

---

### 2.4 Onboarding Data Schema (CONTRACT VIOLATION)

**File:** `src/shared-kernel/validations/onboarding-data.schema.ts`

```typescript
export const OnboardingDataSchema = z.object({
  skills: z.array(SkillSchema),
  noSkills: z.boolean(),
  experiences: z.array(ExperienceSchema),
  noExperience: z.boolean(),
  education: z.array(EducationSchema),
  noEducation: z.boolean(),
  languages: z.array(LanguageSchema),
  // ...
});
```

**Should be:**

```typescript
export const OnboardingDataSchema = z.object({
  sections: z.array(
    z.object({
      sectionTypeKey: z.string(),
      items: z.array(z.record(z.unknown())),
      skipped: z.boolean(),
    }),
  ),
});
```

The frontend sends section items keyed by `sectionTypeKey`, and the backend validates against `SectionType.definition.fields`.

---

### 2.5 DSL Compilers (SECTION-SPECIFIC KNOWLEDGE)

**File:** `src/bounded-contexts/dsl/application/compilers/placeholder.ts`

```typescript
export const PLACEHOLDER_SECTIONS: Partial<Record<string, SectionData>> = {
  experience: { type: 'experience', items: [] },
  education: { type: 'education', items: [] },
  skills: { type: 'skills', items: [] },
  languages: { type: 'languages', items: [] },
  // ...hardcoded section types
};
```

These should be dynamically generated from `SectionType` records in the database.

---

### 2.6 Theme Seeds (LEGACY SECTION IDS)

**Files:**

- `prisma/seeds/classic-theme.seed.ts`
- `prisma/seeds/modern-theme.seed.ts`
- `prisma/seeds/minimal-theme.seed.ts`

```typescript
// WRONG - uses legacy IDs
{ id: 'experiences', visible: true, order: 2, column: 'full-width' },
{ id: 'education', visible: true, order: 3, column: 'full-width' },
{ id: 'skills', visible: true, order: 4, column: 'full-width' },
```

**Should use semantic keys:**

```typescript
{ id: 'work_experience_v1', visible: true, order: 2, column: 'full-width' },
{ id: 'education_v1', visible: true, order: 3, column: 'full-width' },
{ id: 'skill_set_v1', visible: true, order: 4, column: 'full-width' },
```

---

## Part 3: The Correct Architecture

### 3.1 Single Source of Truth: SectionType Table

```prisma
model SectionType {
  id           String @id
  key          String @unique  // "work_experience_v1"
  slug         String          // "work-experience"
  title        String          // "Experience"
  semanticKind String          // "WORK_EXPERIENCE"
  definition   Json            // Full schema definition
  isActive     Boolean
}
```

**The `definition` JSON contains EVERYTHING:**

```typescript
{
  schemaVersion: 1,
  kind: "WORK_EXPERIENCE",
  constraints: {
    allowsMultipleItems: true,
    minItems: 0,
    maxItems: 20
  },
  fields: [
    { key: "company", type: "string", required: true, semanticRole: "ORGANIZATION" },
    { key: "position", type: "string", required: true, semanticRole: "JOB_TITLE" },
    { key: "startDate", type: "date", required: true, semanticRole: "DATE_START" },
    // ...
  ],
  ats: {
    isMandatory: true,
    recommendedPosition: 1,
    scoring: {
      baseScore: 30,
      fieldWeights: { company: 10, position: 10, description: 10 }
    }
  },
  export: {
    jsonResume: { sectionKey: "work", fieldMapping: { company: "company", position: "position" } },
    dsl: { sectionId: "experience", astType: "experience" }
  }
}
```

### 3.2 Code that NEVER Knows Section Types

```typescript
// ✅ CORRECT - Generic validation
class GenericSectionService {
  async createItem(sectionTypeKey: string, content: unknown) {
    const sectionType = await this.repo.findByKey(sectionTypeKey);
    const schema = this.zodFactory.buildSchema(sectionType.definition);
    const validated = schema.parse(content);
    return this.repo.createItem(validated);
  }
}

// ❌ WRONG - Section-specific knowledge
class ExperienceService {
  async create(dto: CreateExperienceDto) { ... }
}
```

### 3.3 ATS Validation Using Definition

```typescript
// ✅ CORRECT
class MandatorySectionsPolicy {
  async validate(snapshot: SemanticResumeSnapshot) {
    const mandatoryTypes = await this.repo.findWhere({
      'definition->ats->isMandatory': true,
    });
    for (const type of mandatoryTypes) {
      if (!snapshot.items.some((i) => i.sectionKind === type.semanticKind)) {
        issues.push({ code: 'MISSING_MANDATORY_SECTION', section: type.title });
      }
    }
  }
}
```

---

## Part 4: Migration Checklist (Big Bang)

### Phase 1: Delete Legacy Files

- [ ] Delete `src/shared-kernel/schemas/resume/sections/*.schema.ts` (14 files)
- [ ] Delete section-specific onboarding services (8 files)
- [ ] Delete section-specific export builders (4 files)

### Phase 2: Refactor Core Services

- [ ] Replace `SectionProjectionAdapter` with generic projection
- [ ] Refactor `OnboardingService` to use `GenericResumeSectionsService`
- [ ] Refactor `DocxBuilderService` to read export mappings from SectionType

### Phase 3: Refactor ATS Validation

- [ ] `MandatorySemanticPolicy` reads from `ats.isMandatory`
- [ ] `SectionOrderSemanticPolicy` reads from `ats.recommendedPosition`
- [ ] `ContentQualitySemanticPolicy` reads from `ats.scoring.fieldWeights`
- [ ] `CVSectionParser` section keywords loaded from DB metadata

### Phase 4: Refactor DSL

- [ ] Delete `src/shared-kernel/ast/section-data.schema.ts`
- [ ] Create generic AST structure using `content: Record<string, unknown>`
- [ ] DSL compilers read from SectionType definitions

### Phase 5: Refactor Prisma Schema

- [ ] Migrate `AnalyticsResumeProjection` to use JSON section counts
- [ ] Add migration to convert existing data

### Phase 6: Refactor Seeds

- [ ] Update theme seeds to use semantic keys
- [ ] Update analytics projection seed

### Phase 7: Contracts/Frontend

- [ ] Update `OnboardingDataSchema` to use generic sections format
- [ ] Update frontend to send `sectionTypeKey` + generic content

---

## Part 5: Files Involved Summary

### Files to DELETE (Total: ~30 files)

| Category                | Files | Action |
| ----------------------- | ----- | ------ |
| Legacy Schemas          | 14    | DELETE |
| Onboarding Services     | 8     | DELETE |
| Export Builders         | 4     | DELETE |
| DSL Section Data Schema | 1     | DELETE |

### Files to REFACTOR (Total: ~25 files)

| File                                 | Issue                                |
| ------------------------------------ | ------------------------------------ |
| `section-projection.adapter.ts`      | Remove all type-specific projections |
| `onboarding-data.schema.ts`          | Make generic                         |
| `content-quality-semantic.policy.ts` | Read from SectionType.definition     |
| `mandatory-semantic.policy.ts`       | Read from SectionType.definition     |
| `section-order-semantic.policy.ts`   | Read from SectionType.definition     |
| `cv-section.parser.ts`               | Load section detection from DB       |
| `docx-builder.service.ts`            | Use generic builder                  |
| `docx-sections.service.ts`           | Use SectionType export mappings      |
| `resume-latex.service.ts`            | Use SectionType export mappings      |
| `resume-json.service.ts`             | Use SectionType export mappings      |
| `dsl-compiler.service.ts`            | Use generic section compilation      |
| `placeholder.ts`                     | Generate from SectionType records    |
| `analytics-projection.prisma`        | Use JSON for section counts          |
| Theme seeds (3 files)                | Use semantic keys                    |
| `analytics-projection.seed.ts`       | Use dynamic section mapping          |

---

## Final Words from Uncle Bob

_"The only way to go fast is to go well."_

You've taken the first step toward generic sections, but you stopped at 50%. You created the model, then you layered adapters to preserve backward compatibility. That's not refactoring—that's avoidance.

**The Boy Scout Rule says:** Leave the code cleaner than you found it.

**My recommendation:** Execute this big bang. You said you have rollbacks configured. Good. Rip out ALL the legacy patterns. Make the code truly generic. When you're done, the code should have NO KNOWLEDGE of what "experience" or "education" means. It should only know:

1. SectionType has a definition
2. Definition has fields for validation
3. Definition has ATS config for scoring
4. Definition has export config for mapping

Everything else is derived from data, not code.

_"Clean code always looks like it was written by someone who cares."_

Now go care about your code.

---

**Signed,**
Robert C. Martin (Uncle Bob)
_50+ years of cleaning up code, and still finding messes._
