/**
 * Adapter that maps Prisma resume rows to the AtsSimulationInput shape the
 * parser simulator expects. Lives in the ATS context (not in resumes/) so
 * the resumes module doesn't need to know about ATS internals.
 */

import type { AtsSimulationInput } from './ats-parser-simulator';

export interface ResumeForSimulation {
  layout?: { type?: string | null } | null;
  sections: Array<{
    title: string | null;
    semanticKind: string;
    column?: string | null;
    items: Array<{
      content: Record<string, unknown> | null;
    }>;
  }>;
}

function flattenContentToFields(content: Record<string, unknown> | null): Record<string, string> {
  if (!content) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(content)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      out[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value);
    } else if (Array.isArray(value)) {
      out[key] = value.filter((v) => typeof v === 'string').join(', ');
    }
    // Nested objects are intentionally ignored — ATS parsers see flat text.
  }
  return out;
}

function normaliseColumn(raw: string | null | undefined): 'main' | 'sidebar' | 'full-width' {
  if (raw === 'sidebar') return 'sidebar';
  if (raw === 'main') return 'main';
  return 'full-width';
}

export function buildSimulationInput(resume: ResumeForSimulation): AtsSimulationInput {
  const layoutType = resume.layout?.type === 'two-column' ? 'two-column' : 'single-column';

  return {
    layout: { type: layoutType },
    sections: resume.sections.map((s) => ({
      title: s.title ?? '',
      semanticKind: s.semanticKind,
      column: normaliseColumn(s.column),
      items: s.items.map((it) => ({ fields: flattenContentToFields(it.content) })),
    })),
  };
}
