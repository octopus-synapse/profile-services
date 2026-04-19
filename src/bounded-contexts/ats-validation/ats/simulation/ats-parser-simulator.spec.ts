import { describe, expect, it } from 'bun:test';
import { simulateAtsParsing } from './ats-parser-simulator';

describe('simulateAtsParsing', () => {
  it('strips decorative glyphs and unicode bullets from item fields', () => {
    const result = simulateAtsParsing({
      layout: { type: 'single-column' },
      sections: [
        {
          title: 'Experience',
          semanticKind: 'WORK_EXPERIENCE',
          column: 'full-width',
          items: [{ fields: { bullet: '★ Led the migration • shipped in Q2' } }],
        },
      ],
    });
    expect(result.sections[0].items[0].fields.bullet).not.toContain('★');
    expect(result.sections[0].items[0].fields.bullet).not.toContain('•');
    expect(result.sections[0].items[0].fields.bullet).toContain('-');
  });

  it('normalises "Jan 2024" style dates to ISO-lite YYYY-MM', () => {
    const result = simulateAtsParsing({
      layout: { type: 'single-column' },
      sections: [
        {
          title: 'Experience',
          semanticKind: 'WORK_EXPERIENCE',
          column: 'full-width',
          items: [{ fields: { period: 'Jan 2024 — Mar 2025' } }],
        },
      ],
    });
    expect(result.sections[0].items[0].fields.period).toContain('2024-01');
    expect(result.sections[0].items[0].fields.period).toContain('2025-03');
  });

  it('pushes sidebar sections to the end for two-column layouts and warns', () => {
    const result = simulateAtsParsing({
      layout: { type: 'two-column' },
      sections: [
        {
          title: 'Skills',
          semanticKind: 'SKILL_SET',
          column: 'sidebar',
          items: [{ fields: { name: 'TypeScript' } }],
        },
        {
          title: 'Experience',
          semanticKind: 'WORK_EXPERIENCE',
          column: 'main',
          items: [{ fields: { bullet: 'Led X' } }],
        },
      ],
    });
    expect(result.sections[0].semanticKind).toBe('WORK_EXPERIENCE');
    expect(result.sections[1].semanticKind).toBe('SKILL_SET');
    expect(result.warnings.some((w) => w.includes('sidebar'))).toBe(true);
  });

  it('marks sections with unknown semantic kind as MISC and warns', () => {
    const result = simulateAtsParsing({
      layout: { type: 'single-column' },
      sections: [
        {
          title: 'Hobbies',
          semanticKind: 'HOBBIES',
          column: 'full-width',
          items: [],
        },
      ],
    });
    expect(result.sections[0].semanticKind).toBe('MISC');
    expect(result.warnings.some((w) => w.includes('Hobbies'))).toBe(true);
  });

  it('produces a linear extractedText that starts with the first section title', () => {
    const result = simulateAtsParsing({
      layout: { type: 'single-column' },
      sections: [
        {
          title: 'Summary',
          semanticKind: 'SUMMARY',
          column: 'full-width',
          items: [{ fields: { text: 'Backend engineer.' } }],
        },
      ],
    });
    expect(result.extractedText.startsWith('SUMMARY')).toBe(true);
    expect(result.extractedText).toContain('Backend engineer.');
  });
});
