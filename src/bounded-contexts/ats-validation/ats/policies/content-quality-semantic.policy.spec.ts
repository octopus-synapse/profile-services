import { describe, expect, it } from 'bun:test';
import type {
  SemanticResumeSnapshot,
  SectionTypeAtsEntry,
} from '../interfaces';
import { ContentQualitySemanticPolicy } from './content-quality-semantic.policy';

// ============================================================================
// Generic Test Helpers (no hardcoded semantic kinds)
// ============================================================================

function createCatalogEntry(
  kind: string,
  requiredRoles: string[] = [],
): SectionTypeAtsEntry {
  return {
    key: `${kind.toLowerCase()}_v1`,
    kind,
    ats: {
      isMandatory: false,
      recommendedPosition: 0,
      scoring: {
        baseScore: 30,
        fieldWeights: {},
        requiredSemanticRoles: requiredRoles,
      },
    },
  };
}

function createItem(
  kind: string,
  roles: Array<{ role: string; value: string }>,
) {
  return {
    sectionTypeKey: `${kind.toLowerCase()}_v1`,
    sectionTypeVersion: 1,
    sectionKind: kind,
    values: roles,
  };
}

describe('ContentQualitySemanticPolicy', () => {
  const policy = new ContentQualitySemanticPolicy();

  // ==========================================================================
  // Catalog-Driven Required Roles (Generic)
  // ==========================================================================

  it('warns when required roles from catalog are missing', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-1',
      sectionTypeCatalog: [
        createCatalogEntry('CUSTOM_SECTION', ['TITLE', 'ORGANIZATION']),
      ],
      items: [
        createItem('CUSTOM_SECTION', [{ role: 'DESCRIPTION', value: 'text' }]),
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some(
        (issue) => issue.code === 'MISSING_REQUIRED_SEMANTIC_ROLES',
      ),
    ).toBe(true);
    expect(
      result.issues.find(
        (issue) => issue.code === 'MISSING_REQUIRED_SEMANTIC_ROLES',
      )?.message,
    ).toContain('TITLE');
    expect(
      result.issues.find(
        (issue) => issue.code === 'MISSING_REQUIRED_SEMANTIC_ROLES',
      )?.message,
    ).toContain('ORGANIZATION');
  });

  it('passes when all required roles from catalog are present', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-2',
      sectionTypeCatalog: [
        createCatalogEntry('MY_SECTION', ['FIELD_A', 'FIELD_B']),
      ],
      items: [
        createItem('MY_SECTION', [
          { role: 'FIELD_A', value: 'Value A' },
          { role: 'FIELD_B', value: 'Value B' },
        ]),
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some(
        (issue) => issue.code === 'MISSING_REQUIRED_SEMANTIC_ROLES',
      ),
    ).toBe(false);
  });

  it('skips required roles check for kinds not in catalog', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-3',
      sectionTypeCatalog: [], // Empty catalog
      items: [
        createItem('UNKNOWN_KIND', [{ role: 'DESCRIPTION', value: 'text' }]),
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some(
        (issue) => issue.code === 'MISSING_REQUIRED_SEMANTIC_ROLES',
      ),
    ).toBe(false);
  });

  it('skips required roles check when catalog entry has no requiredSemanticRoles', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-4',
      sectionTypeCatalog: [createCatalogEntry('FLEXIBLE_SECTION', [])], // No required roles
      items: [
        createItem('FLEXIBLE_SECTION', [{ role: 'ANYTHING', value: 'value' }]),
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some(
        (issue) => issue.code === 'MISSING_REQUIRED_SEMANTIC_ROLES',
      ),
    ).toBe(false);
  });

  // ==========================================================================
  // Text Quality (Generic)
  // ==========================================================================

  it('flags short description regardless of section kind', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-5',
      sectionTypeCatalog: [createCatalogEntry('ANY_SECTION', [])],
      items: [
        createItem('ANY_SECTION', [
          { role: 'DESCRIPTION', value: 'Too short' },
        ]),
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some((issue) => issue.code === 'DESCRIPTION_TOO_SHORT'),
    ).toBe(true);
  });

  it('passes description quality when text is long enough', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-6',
      sectionTypeCatalog: [createCatalogEntry('DETAILED_SECTION', [])],
      items: [
        createItem('DETAILED_SECTION', [
          {
            role: 'DESCRIPTION',
            value:
              'This is a sufficiently long description that provides meaningful context and will pass the quality check.',
          },
        ]),
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some((issue) => issue.code === 'DESCRIPTION_TOO_SHORT'),
    ).toBe(false);
  });
});
