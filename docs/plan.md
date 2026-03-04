Generic Resume Sections: Complete Refactoring Plan
Philosophy: "Make it work, make it right, make it fast." — Kent Beck

Discipline: "The only way to go fast is to go well." — Uncle Bob

Overview
This plan transforms the codebase from section-aware code to section-agnostic code. After this refactoring:

The code knows NOTHING about section types (no experience, education, etc.)
All section knowledge lives in SectionType.definition (database)
Validation, ATS, Export, DSL all derive behavior from definitions
Execution Strategy
No backward compatibility — clean break
Big bang merge — rollback via version tags if needed
Test-first for new code — characterization tests for legacy
Small PRs within milestones — reviewable chunks
Milestone 1: Foundation & Contracts (Issues #1-8)
Goal: Establish the canonical types and ensure SectionType definitions are complete.

Issue #1: Audit and Complete SectionType Definitions
Type: enhancement | Priority: P0 | Estimate: 3h

Review all 15 section types in section-type.seed.ts and ensure each has:

definition.fields with all field schemas
definition.ats.isMandatory, recommendedPosition, scoring.fieldWeights
definition.export.jsonResume.fieldMapping
definition.export.dsl.sectionId
Acceptance Criteria:

All 15 section types have complete definition JSON
Unit test validates all definitions against SectionDefinitionSchema
Migration script to update existing DB records
Issue #2: Create Canonical Generic Section Types
Type: refactor | Priority: P0 | Estimate: 2h

Consolidate in generic-section.types.ts:

GenericSectionItem
GenericResumeSection
GenericResume
SemanticKind = string (not union)
Issue #3: Enhance SectionDefinitionZodFactory with All Field Types
Type: enhancement | Priority: P0 | Estimate: 3h

Ensure factory handles: nested objects, arrays, enums, date coercion, optional/nullable.

Issue #4: Create SectionTypeRepository with Caching
Type: enhancement | Priority: P0 | Estimate: 2h

Issue #5: Define ATS Configuration Schema in SectionType
Type: enhancement | Priority: P0 | Estimate: 2h

Issue #6: Define Export Configuration Schema in SectionType
Type: enhancement | Priority: P0 | Estimate: 2h

Issue #7: Create GenericSectionValidationService
Type: feature | Priority: P0 | Estimate: 3h

Issue #8: Update OnboardingDataSchema to Generic Format
Type: breaking-change | Priority: P0 | Estimate: 3h

Milestone 2: Delete Legacy Schemas (Issues #9-16)
Goal: Remove all section-specific schemas.

Issue #9: Delete experience.schema.ts
Files: experience.schema.ts

Issue #10: Delete education.schema.ts
Issue #11: Delete skill.schema.ts
Issue #12: Delete language.schema.ts
Issue #13: Delete certification.schema.ts
Issue #14: Delete project.schema.ts
Issue #15: Delete award.schema.ts
Issue #16: Delete Remaining Section Schemas (7 files)
bug-bounty.schema.ts, hackathon.schema.ts, interest.schema.ts
open-source.schema.ts, publication.schema.ts, recommendation.schema.ts, talk.schema.ts
Milestone 3: Refactor Onboarding (Issues #17-23)
Issue #17: Create GenericSectionOnboardingService
Type: feature | Priority: P0 | Estimate: 4h

Issue #18: Delete ExperienceOnboardingService
Issue #19: Delete EducationOnboardingService
Issue #20: Delete SkillsOnboardingService
Issue #21: Delete LanguagesOnboardingService
Issue #22: Refactor OnboardingService to Use GenericSectionOnboardingService
Estimate: 2h

Issue #23: Update Onboarding Integration Tests
Estimate: 2h

Milestone 4: Refactor ATS Validation (Issues #24-33)
Issue #24: Create ATSSectionTypeAdapter
Type: feature | Priority: P0 | Estimate: 3h

Issue #25: Refactor MandatorySemanticPolicy
Read from definition.ats.isMandatory

Issue #26: Refactor SectionOrderSemanticPolicy
Read from definition.ats.recommendedPosition

Issue #27: Refactor ContentQualitySemanticPolicy
Read from definition.ats.scoring.requiredSemanticRoles

Issue #28: Refactor CVSectionParser - Section Detection
Load keywords from definition.ats.sectionDetection

Issue #29: Refactor DefinitionDrivenScoringStrategy
Read weights from definition.ats.scoring.fieldWeights

Issue #30: Delete Hardcoded ATS Constants
Issue #31: Update ATS Unit Tests
Issue #32: Create ATS Integration Test with Dynamic SectionTypes
Issue #33: Delete Legacy ATS Validators
Milestone 5: Refactor Export (Issues #34-41)
Issue #34: Create GenericDocxSectionBuilder
Type: feature | Priority: P0 | Estimate: 4h

Issue #35: Delete docx-experience.builder.ts
Issue #36: Delete docx-education.builder.ts
Issue #37: Delete docx-project.builder.ts
Issue #38: Delete docx-skills.builder.ts
Issue #39: Refactor DocxBuilderService
Issue #40: Refactor ResumeLatexService
Issue #41: Refactor ResumeJsonService
Milestone 6: Refactor DSL (Issues #42-48)
Issue #42: Delete section-data.schema.ts
Delete all type-specific AST schemas.

Issue #43: Create GenericSectionDataSchema
Issue #44: Refactor DSL Compilers to Generic
Issue #45: Delete placeholder.ts Section-Specific Constants
Issue #46: Refactor DslCompilerService
Issue #47: Refactor DslRepository
Issue #48: Update DSL Tests
Milestone 7: Refactor SectionProjectionAdapter (Issues #49-52)
Issue #49: Create GenericProjectionService
Issue #50: Delete SectionProjectionAdapter Type-Specific Methods
Delete projectExperience(), projectEducation(), etc. (all 15)

Issue #51: Update All Consumers of SectionProjectionAdapter
Issue #52: Delete Legacy Projection Types
Milestone 8: Refactor Analytics & Prisma (Issues #53-58)
Issue #53: Migrate AnalyticsResumeProjection to JSON Section Counts
Issue #54: Create Prisma Migration for sectionCounts
Issue #55: Refactor Analytics Event Handlers
Issue #56: Refactor BenchmarkService
Issue #57: Refactor DashboardService
Issue #58: Update Analytics Seeds
Milestone 9: Refactor Themes & Seeds (Issues #59-63)
Issue #59: Update Theme Seeds to Use Semantic Keys
Issue #60: Refactor ConfigValidator
Issue #61: Refactor SectionVisibilityService
Issue #62: Refactor SectionOrderingService
Issue #63: Create Theme Migration for Legacy Section IDs
Milestone 10: Architecture Tests & Guardrails (Issues #64-68)
Issue #64: Architecture Test: No Section-Specific Imports
Fail if any file imports section-specific schemas.

Issue #65: Architecture Test: No Hardcoded SemanticKind
Fail if any file contains 'WORK_EXPERIENCE', 'EDUCATION' strings.

Issue #66: Architecture Test: SectionType Source of Truth
Issue #67: Update generic-sections-guardrail.architecture.spec.ts
Issue #68: Document Architecture Decision Record (ADR)
Milestone 11: Cleanup & Final Polish (Issues #69-75)
Issue #69: Delete Unused Constants
Issue #70: Delete Unused DTOs
Issue #71: Update OpenAPI/Swagger Docs
Issue #72: Update README with New Architecture
Issue #73: Run Full Test Suite & Fix Failures
Issue #74: Run E2E Tests & Fix Failures
Issue #75: Final Code Review & Merge
Summary
Milestone Issues Est. Hours Focus

1. Foundation #1-8 20h SectionType definitions, canonical types
2. Delete Schemas #9-16 4.5h Remove legacy schemas
3. Onboarding #17-23 12h Generic onboarding
4. ATS #24-33 21h Definition-driven ATS
5. Export #34-41 14h Generic export builders
6. DSL #42-48 16h Generic DSL compilation
7. Projections #49-52 12h Kill SectionProjectionAdapter
8. Analytics #53-58 13h Dynamic section counts
9. Themes #59-63 10h Semantic keys
10. Guardrails #64-68 9h Architecture tests
11. Cleanup #69-75 14h Final polish
    Total: 75 Issues | ~145.5 hours | ~3-4 weeks

Execution Order (Kent Beck Style)
Milestone 1 — Must complete first (foundation)
Milestones 2-6 — Can be parallelized across team
Milestone 7 — Depends on 5 & 6
Milestone 8 — Independent, can parallel
Milestone 9 — After Milestone 1
Milestones 10-11 — Final phase
Definition of Done
Each issue is DONE when:

✅ Code compiles with no errors
✅ All existing tests pass
✅ New code has >90% test coverage
✅ No hardcoded section types introduced
✅ Code reviewed
✅ Architecture tests pass
✅ No linting errors
"Clean code always looks like it was written by someone who cares." — Uncle Bob

Claude Opus 4.5 • 3x
