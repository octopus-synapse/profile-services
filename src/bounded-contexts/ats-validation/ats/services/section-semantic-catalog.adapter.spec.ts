import { describe, expect, it, mock } from 'bun:test';
import { SectionSemanticCatalogAdapter } from './section-semantic-catalog.adapter';

/**
 * Helper to build a mock PrismaService with both resumeSection.findMany
 * and sectionType.findMany resolvers.
 */
function buildPrismaMock(resumeSections: unknown[], sectionTypes: unknown[] = []) {
  return {
    resumeSection: { findMany: mock(async () => resumeSections) },
    sectionType: { findMany: mock(async () => sectionTypes) },
  } as unknown as ConstructorParameters<typeof SectionSemanticCatalogAdapter>[0];
}

describe('SectionSemanticCatalogAdapter', () => {
  it('maps section items into semantic snapshot using semantic roles', async () => {
    const prisma = buildPrismaMock(
      [
        {
          sectionType: {
            key: 'work_experience_v1',
            version: 1,
            semanticKind: 'WORK_EXPERIENCE',
            definition: {
              schemaVersion: 1,
              kind: 'WORK_EXPERIENCE',
              fields: [
                {
                  key: 'company',
                  type: 'string',
                  semanticRole: 'ORGANIZATION',
                },
                { key: 'role', type: 'string', semanticRole: 'JOB_TITLE' },
              ],
            },
          },
          items: [
            {
              content: {
                company: 'Octopus',
                role: 'Backend Engineer',
                ignoredField: 'x',
              },
            },
          ],
        },
      ],
      [
        {
          key: 'work_experience_v1',
          semanticKind: 'WORK_EXPERIENCE',
          definition: {
            schemaVersion: 1,
            kind: 'WORK_EXPERIENCE',
            fields: [],
            ats: {
              isMandatory: true,
              recommendedPosition: 2,
              scoring: {
                baseScore: 30,
                fieldWeights: { ORGANIZATION: 20, JOB_TITLE: 25 },
              },
            },
          },
        },
      ],
    );

    const adapter = new SectionSemanticCatalogAdapter(prisma);
    const snapshot = await adapter.getSemanticResumeSnapshot('resume-1');

    expect(snapshot.resumeId).toBe('resume-1');
    expect(snapshot.items.length).toBe(1);
    expect(snapshot.items[0].sectionKind).toBe('WORK_EXPERIENCE');
    expect(snapshot.items[0].values).toEqual([
      { role: 'ORGANIZATION', value: 'Octopus' },
      { role: 'JOB_TITLE', value: 'Backend Engineer' },
    ]);

    // Verify sectionTypeCatalog built from active section types
    expect(snapshot.sectionTypeCatalog.length).toBe(1);
    expect(snapshot.sectionTypeCatalog[0].kind).toBe('WORK_EXPERIENCE');
    expect(snapshot.sectionTypeCatalog[0].ats.isMandatory).toBe(true);
    expect(snapshot.sectionTypeCatalog[0].ats.scoring.baseScore).toBe(30);
  });

  it('falls back to CUSTOM for unknown semantic kind', async () => {
    const prisma = buildPrismaMock([
      {
        sectionType: {
          key: 'freelance_v1',
          version: 1,
          semanticKind: '',
          definition: {
            schemaVersion: 1,
            kind: 'CUSTOM',
            fields: [{ key: 'title', type: 'string', semanticRole: 'TITLE' }],
          },
        },
        items: [{ content: { title: 'Freelance Adventures' } }],
      },
    ]);

    const adapter = new SectionSemanticCatalogAdapter(prisma);
    const snapshot = await adapter.getSemanticResumeSnapshot('resume-2');

    expect(snapshot.items[0].sectionKind).toBe('CUSTOM');
  });

  it('extracts semantic values from nested fields and array subitems', async () => {
    const prisma = buildPrismaMock([
      {
        sectionType: {
          key: 'certification_v2',
          version: 2,
          semanticKind: 'CERTIFICATION',
          definition: {
            schemaVersion: 1,
            kind: 'CERTIFICATION',
            fields: [
              {
                key: 'certification',
                type: 'object',
                fields: [
                  { key: 'title', type: 'string', semanticRole: 'TITLE' },
                  {
                    key: 'issuer',
                    type: 'string',
                    semanticRole: 'ORGANIZATION',
                  },
                ],
              },
              {
                key: 'attachments',
                type: 'array',
                items: {
                  type: 'object',
                  fields: [
                    {
                      key: 'url',
                      type: 'string',
                      semanticRole: 'PROOF_URL',
                    },
                  ],
                },
              },
            ],
          },
        },
        items: [
          {
            content: {
              certification: {
                title: 'AWS SAA',
                issuer: 'Amazon',
              },
              attachments: [{ url: 'https://example.com/cert.pdf' }],
            },
          },
        ],
      },
    ]);

    const adapter = new SectionSemanticCatalogAdapter(prisma);
    const snapshot = await adapter.getSemanticResumeSnapshot('resume-3');

    expect(snapshot.items[0].values).toEqual([
      { role: 'TITLE', value: 'AWS SAA' },
      { role: 'ORGANIZATION', value: 'Amazon' },
      { role: 'PROOF_URL', value: 'https://example.com/cert.pdf' },
    ]);
  });

  it('builds sectionTypeCatalog with safe defaults when ats config is missing', async () => {
    const prisma = buildPrismaMock(
      [],
      [
        {
          key: 'custom_v1',
          semanticKind: 'CUSTOM',
          definition: {
            schemaVersion: 1,
            kind: 'CUSTOM',
            fields: [],
            // no ats config
          },
        },
      ],
    );

    const adapter = new SectionSemanticCatalogAdapter(prisma);
    const snapshot = await adapter.getSemanticResumeSnapshot('resume-4');

    expect(snapshot.sectionTypeCatalog.length).toBe(1);
    expect(snapshot.sectionTypeCatalog[0].ats.isMandatory).toBe(false);
    expect(snapshot.sectionTypeCatalog[0].ats.recommendedPosition).toBe(99);
    expect(snapshot.sectionTypeCatalog[0].ats.scoring.baseScore).toBe(30);
  });
});
