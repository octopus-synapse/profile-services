import { describe, expect, it, mock } from 'bun:test';
import { SectionSemanticCatalogAdapter } from './section-semantic-catalog.adapter';

describe('SectionSemanticCatalogAdapter', () => {
  it('maps section items into semantic snapshot using semantic roles', async () => {
    const findMany = mock(async () => [
      {
        sectionType: {
          key: 'work_experience_v1',
          version: 1,
          semanticKind: 'WORK_EXPERIENCE',
          definition: {
            schemaVersion: 1,
            kind: 'WORK_EXPERIENCE',
            fields: [
              { key: 'company', type: 'string', semanticRole: 'ORGANIZATION' },
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
    ]);

    const prisma = {
      resumeSection: { findMany },
    } as unknown as ConstructorParameters<
      typeof SectionSemanticCatalogAdapter
    >[0];

    const adapter = new SectionSemanticCatalogAdapter(prisma);

    const snapshot = await adapter.getSemanticResumeSnapshot('resume-1');

    expect(snapshot.resumeId).toBe('resume-1');
    expect(snapshot.items.length).toBe(1);
    expect(snapshot.items[0].sectionKind).toBe('WORK_EXPERIENCE');
    expect(snapshot.items[0].values).toEqual([
      { role: 'ORGANIZATION', value: 'Octopus' },
      { role: 'JOB_TITLE', value: 'Backend Engineer' },
    ]);
  });

  it('falls back to CUSTOM for unknown semantic kind', async () => {
    const prisma = {
      resumeSection: {
        findMany: mock(async () => [
          {
            sectionType: {
              key: 'freelance_v1',
              version: 1,
              semanticKind: '',
              definition: {
                schemaVersion: 1,
                kind: 'CUSTOM',
                fields: [
                  { key: 'title', type: 'string', semanticRole: 'TITLE' },
                ],
              },
            },
            items: [{ content: { title: 'Freelance Adventures' } }],
          },
        ]),
      },
    } as unknown as ConstructorParameters<
      typeof SectionSemanticCatalogAdapter
    >[0];

    const adapter = new SectionSemanticCatalogAdapter(prisma);
    const snapshot = await adapter.getSemanticResumeSnapshot('resume-2');

    expect(snapshot.items[0].sectionKind).toBe('CUSTOM');
  });

  it('extracts semantic values from nested fields and array subitems', async () => {
    const prisma = {
      resumeSection: {
        findMany: mock(async () => [
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
        ]),
      },
    } as unknown as ConstructorParameters<
      typeof SectionSemanticCatalogAdapter
    >[0];

    const adapter = new SectionSemanticCatalogAdapter(prisma);
    const snapshot = await adapter.getSemanticResumeSnapshot('resume-3');

    expect(snapshot.items[0].values).toEqual([
      { role: 'TITLE', value: 'AWS SAA' },
      { role: 'ORGANIZATION', value: 'Amazon' },
      { role: 'PROOF_URL', value: 'https://example.com/cert.pdf' },
    ]);
  });
});
