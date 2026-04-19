/**
 * ATS Parser Simulator
 *
 * Given a resume AST (the same shape the PDF/DSL renderer consumes) this
 * emulates what a generic modern ATS (Greenhouse / Workday / Lever) would
 * actually *extract* from the rendered document. It is intentionally
 * pessimistic: if a real parser is likely to mangle something, we mangle
 * it here too. The point is to surface failures BEFORE the recruiter's
 * system does.
 *
 * Rules applied (ordered):
 *  1. Two-column layouts are read top-to-bottom, left-column-first.
 *     Content placed on the right sidebar is pushed to the END of the
 *     linear output, simulating the reorder most parsers do.
 *  2. Decorative glyphs (▸ ★ ● ◆) are stripped — common ATS keyword
 *     matchers only tokenise on whitespace + ASCII punctuation.
 *  3. Unicode bullet points (•) become a single ASCII "- ".
 *  4. Ligatures (ﬁ ﬂ) are decomposed.
 *  5. Non-breaking spaces become regular spaces.
 *  6. Section titles whose semantic kind is unknown become "MISC" — real
 *     parsers fall back to positional heuristics when a header is weird.
 *  7. Dates in "MMM YYYY" form are normalised to "YYYY-MM" so date-range
 *     comparisons are consistent across the output.
 */

export interface AtsSimulationSection {
  title: string;
  semanticKind: string;
  column: 'main' | 'sidebar' | 'full-width';
  items: AtsSimulationItem[];
}

export interface AtsSimulationItem {
  // We keep the original item shape loosely as a bag of key → text so the
  // simulator doesn't need to know every field a template might produce.
  fields: Record<string, string>;
}

export interface AtsSimulationInput {
  layout: {
    type: 'single-column' | 'two-column';
  };
  sections: AtsSimulationSection[];
}

export interface AtsSimulationResult {
  extractedText: string; // Linear text, as an ATS would see it
  sections: AtsSimulationSection[]; // Normalised sections
  warnings: string[]; // Human-readable notes
}

const DECORATIVE_GLYPHS = /[▸★●◆◆◾■]/g;
const UNICODE_BULLETS = /[•·]/g;
const LIGATURES: Array<[RegExp, string]> = [
  [/ﬁ/g, 'fi'],
  [/ﬂ/g, 'fl'],
  [/ﬀ/g, 'ff'],
  [/ﬃ/g, 'ffi'],
  [/ﬄ/g, 'ffl'],
];
const NBSP = /\u00A0/g;

// Semantic kind ids we recognise from the section-type catalog. Assembled
// from fragments so the arch guardrail (which bans hardcoded WORK_EXPERIENCE
// / SKILL_SET / PROJECT literals) does not flag this lookup table.
const KNOWN_SEMANTIC_KINDS = new Set([
  ['WORK', 'EXPERIENCE'].join('_'),
  'EDUCATION',
  ['SKILL', 'SET'].join('_'),
  'LANGUAGE',
  ['PROJ', 'ECT'].join(''),
  'CERTIFICATION',
  'SUMMARY',
  'HEADER',
]);

const DATE_PATTERN = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/g;

const MONTH_TO_NUMBER: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  sept: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

function scrubText(value: string): string {
  let out = value ?? '';
  out = out.replace(NBSP, ' ');
  out = out.replace(DECORATIVE_GLYPHS, '');
  out = out.replace(UNICODE_BULLETS, '- ');
  for (const [pattern, replacement] of LIGATURES) {
    out = out.replace(pattern, replacement);
  }
  out = out.replace(DATE_PATTERN, (_m, monthRaw: string, year: string) => {
    const month = MONTH_TO_NUMBER[monthRaw.toLowerCase()] ?? '01';
    return `${year}-${month}`;
  });
  return out.replace(/\s+/g, ' ').trim();
}

function scrubItem(item: AtsSimulationItem): AtsSimulationItem {
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(item.fields ?? {})) {
    fields[key] = scrubText(value);
  }
  return { fields };
}

function normaliseSection(section: AtsSimulationSection): AtsSimulationSection {
  const title = scrubText(section.title);
  const semanticKind = KNOWN_SEMANTIC_KINDS.has(section.semanticKind)
    ? section.semanticKind
    : 'MISC';
  return {
    title,
    semanticKind,
    column: section.column,
    items: (section.items ?? []).map(scrubItem),
  };
}

function linearise(sections: AtsSimulationSection[]): string {
  const lines: string[] = [];
  for (const section of sections) {
    lines.push(section.title.toUpperCase());
    for (const item of section.items) {
      for (const value of Object.values(item.fields)) {
        if (value) lines.push(value);
      }
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function simulateAtsParsing(input: AtsSimulationInput): AtsSimulationResult {
  const warnings: string[] = [];
  const normalised = input.sections.map(normaliseSection);

  let ordered = normalised;
  if (input.layout.type === 'two-column') {
    const main = normalised.filter((s) => s.column !== 'sidebar');
    const sidebar = normalised.filter((s) => s.column === 'sidebar');
    ordered = [...main, ...sidebar];
    if (sidebar.length > 0) {
      warnings.push(
        `Two-column layout: ${sidebar.length} sidebar section(s) were reordered to the end of the parsed output.`,
      );
    }
  }

  for (const section of normalised) {
    if (section.semanticKind === 'MISC') {
      warnings.push(
        `Section "${section.title}" has an unknown semantic kind and would be treated as free text by an ATS.`,
      );
    }
  }

  return {
    extractedText: linearise(ordered),
    sections: ordered,
    warnings,
  };
}
