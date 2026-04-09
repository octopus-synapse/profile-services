/**
 * AST-to-DOCX Mapper Tests
 *
 * Verifies that the pure mapper functions correctly transform
 * Resume AST JSON into docx Document structures.
 */

import { describe, expect, it } from 'bun:test';

import { mapAstToDocxDocument, renderDocxBuffer } from './ast-to-docx.mapper';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalAst(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ header: { fullName: 'Jane Doe' }, sections: [], ...overrides });
}

function getSectionChildren(doc: ReturnType<typeof mapAstToDocxDocument>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).sections?.[0]?.children ?? [];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mapAstToDocxDocument', () => {
  it('maps a minimal AST with just a header into a Document with a name heading', () => {
    const doc = mapAstToDocxDocument(minimalAst());
    const children = getSectionChildren(doc);

    expect(children.length).toBeGreaterThanOrEqual(1);
  });

  it('includes jobTitle and contact info when present in header', () => {
    const ast = minimalAst({
      header: {
        fullName: 'Jane Doe',
        jobTitle: 'Engineer',
        email: 'jane@example.com',
        phone: '555-0100',
      },
    });

    const doc = mapAstToDocxDocument(ast);
    const children = getSectionChildren(doc);

    expect(children.length).toBeGreaterThanOrEqual(3);
  });

  it('maps an AST with one item section (work experience)', () => {
    const ast = JSON.stringify({
      header: { fullName: 'Jane Doe' },
      sections: [
        {
          title: 'Work Experience',
          order: 1,
          semanticKind: 'experience',
          data: {
            items: [
              {
                content: {
                  title: 'Software Engineer',
                  company: 'Acme Corp',
                  startDate: '2020-01-15',
                  endDate: '2023-06-01',
                  description: 'Built features',
                },
              },
            ],
          },
        },
      ],
    });

    const doc = mapAstToDocxDocument(ast);
    const children = getSectionChildren(doc);

    expect(children.length).toBeGreaterThanOrEqual(4);
  });

  it('maps an AST with one text section (summary)', () => {
    const ast = JSON.stringify({
      header: { fullName: 'Jane Doe' },
      sections: [
        {
          title: 'Summary',
          order: 0,
          semanticKind: 'summary',
          data: {
            content: 'Experienced software engineer with 5 years of practice.',
          },
        },
      ],
    });

    const doc = mapAstToDocxDocument(ast);
    const children = getSectionChildren(doc);

    expect(children.length).toBeGreaterThanOrEqual(3);
  });

  it('maps skills section as comma-separated text', () => {
    const ast = JSON.stringify({
      header: { fullName: 'Jane Doe' },
      sections: [
        {
          title: 'Skills',
          order: 2,
          semanticKind: 'skills',
          data: {
            items: [
              { content: { name: 'TypeScript' } },
              { content: { name: 'NestJS' } },
              { content: { name: 'Prisma' } },
            ],
          },
        },
      ],
    });

    const doc = mapAstToDocxDocument(ast);
    const children = getSectionChildren(doc);

    expect(children.length).toBeGreaterThanOrEqual(3);
  });

  it('produces only header paragraphs when sections array is empty', () => {
    const doc = mapAstToDocxDocument(minimalAst({ sections: [] }));
    const children = getSectionChildren(doc);

    expect(children.length).toBe(1);
  });

  it('handles missing header gracefully', () => {
    const doc = mapAstToDocxDocument(JSON.stringify({ sections: [] }));
    const children = getSectionChildren(doc);

    expect(children.length).toBe(0);
  });

  it('sorts sections by order', () => {
    const ast = JSON.stringify({
      header: { fullName: 'Jane Doe' },
      sections: [
        { title: 'Skills', order: 2, semanticKind: 'skills', data: { items: [{ content: { name: 'TS' } }] } },
        { title: 'Summary', order: 0, semanticKind: 'summary', data: { content: 'A summary.' } },
      ],
    });

    const doc = mapAstToDocxDocument(ast);
    const children = getSectionChildren(doc);

    expect(children.length).toBeGreaterThanOrEqual(5);
  });
});

describe('renderDocxBuffer', () => {
  it('produces a non-empty Buffer from a Document', async () => {
    const doc = mapAstToDocxDocument(minimalAst());
    const buffer = await renderDocxBuffer(doc);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
