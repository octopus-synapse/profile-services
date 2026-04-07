import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryAtsValidationPrismaService } from '../../../testing';
import { SectionSemanticCatalogAdapter } from './section-semantic-catalog.adapter';

describe('SectionSemanticCatalogAdapter', () => {
  let adapter: SectionSemanticCatalogAdapter;
  let prisma: InMemoryAtsValidationPrismaService;

  beforeEach(() => {
    prisma = new InMemoryAtsValidationPrismaService();
    adapter = new SectionSemanticCatalogAdapter(
      prisma as unknown as ConstructorParameters<typeof SectionSemanticCatalogAdapter>[0],
    );
  });

  it('maps section items into semantic snapshot using semantic roles', async () => {
    prisma.seedResumeSection({
      id: 'section-1',
      resumeId: 'resume-1',
      sectionType: {
        id: 'type-1',
        key: 'work_experience_v1',
        version: 1,
        semanticKind: 'WORK_EXPERIENCE',
        title: 'Work Experience',
        isActive: true,
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
          id: 'item-1',
          resumeSectionId: 'section-1',
          order: 0,
          isVisible: true,
          content: {
            company: 'Octopus',
            role: 'Backend Engineer',
            ignoredField: 'x',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    prisma.seedSectionType({
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
    });

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
    prisma.seedResumeSection({
      id: 'section-2',
      resumeId: 'resume-2',
      sectionType: {
        id: 'type-2',
        key: 'freelance_v1',
        version: 1,
        semanticKind: '',
        title: 'Freelance',
        isActive: true,
        definition: {
          schemaVersion: 1,
          kind: 'CUSTOM',
          fields: [{ key: 'title', type: 'string', semanticRole: 'TITLE' }],
        },
      },
      items: [
        {
          id: 'item-2',
          resumeSectionId: 'section-2',
          order: 0,
          isVisible: true,
          content: { title: 'Freelance Adventures' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const snapshot = await adapter.getSemanticResumeSnapshot('resume-2');

    expect(snapshot.items[0].sectionKind).toBe('CUSTOM');
  });

  it('extracts semantic values from nested fields and array subitems', async () => {
    prisma.seedResumeSection({
      id: 'section-3',
      resumeId: 'resume-3',
      sectionType: {
        id: 'type-3',
        key: 'certification_v2',
        version: 2,
        semanticKind: 'CERTIFICATION',
        title: 'Certifications',
        isActive: true,
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
          id: 'item-3',
          resumeSectionId: 'section-3',
          order: 0,
          isVisible: true,
          content: {
            certification: {
              title: 'AWS SAA',
              issuer: 'Amazon',
            },
            attachments: [{ url: 'https://example.com/cert.pdf' }],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const snapshot = await adapter.getSemanticResumeSnapshot('resume-3');

    expect(snapshot.items[0].values).toEqual([
      { role: 'TITLE', value: 'AWS SAA' },
      { role: 'ORGANIZATION', value: 'Amazon' },
      { role: 'PROOF_URL', value: 'https://example.com/cert.pdf' },
    ]);
  });

  it('builds sectionTypeCatalog with safe defaults when ats config is missing', async () => {
    prisma.seedSectionType({
      key: 'custom_v1',
      semanticKind: 'CUSTOM',
      definition: {
        schemaVersion: 1,
        kind: 'CUSTOM',
        fields: [],
        // no ats config
      },
    });

    const snapshot = await adapter.getSemanticResumeSnapshot('resume-4');

    expect(snapshot.sectionTypeCatalog.length).toBe(1);
    expect(snapshot.sectionTypeCatalog[0].ats.isMandatory).toBe(false);
    expect(snapshot.sectionTypeCatalog[0].ats.recommendedPosition).toBe(99);
    expect(snapshot.sectionTypeCatalog[0].ats.scoring.baseScore).toBe(30);
  });
});
