/**
 * Resume-quality issue dictionary.
 *
 * Maps every stable `IssueCode` emitted by the `resume-quality` BC
 * (deterministic `CODE_*` rules + AI `AI_*` analyzer) to a localised,
 * candidate-facing label. The route handler localises each issue via
 * `renderQualityIssue` using the request's Accept-Language (Q8 — every
 * user-facing 2xx string comes from a dictionary).
 *
 * For `AI_*` codes the template is the fixed *category* label; the
 * specific, per-bullet rewrite hint travels separately in the issue's
 * `freeformMessage` (already written in the resume's language by the
 * analyzer). The label gives a stable, translated headline; the freeform
 * detail gives specificity.
 *
 * Keep the keys in sync with `IssueCode` in
 * `bounded-contexts/resume-quality/domain/types.ts` — the
 * `i18n-quality-issue-parity` arch spec enforces it.
 */

import type { Locale, LocalizedMessages } from './types';

export interface QualityIssueTemplate {
  readonly message: LocalizedMessages;
  /** Named placeholders the caller must supply. Consumed by tests + docs. */
  readonly params: readonly string[];
}

export type QualityIssueDictionary = Readonly<Record<string, QualityIssueTemplate>>;

export const QUALITY_ISSUE_DICTIONARY = {
  // ── Completeness (deterministic) ───────────────────────────────────
  CODE_MISSING_FULL_NAME: {
    message: { en: 'Add your full name.', 'pt-BR': 'Adicione seu nome completo.' },
    params: [],
  },
  CODE_MISSING_EMAIL: {
    message: { en: 'Add a contact email.', 'pt-BR': 'Adicione um e-mail de contato.' },
    params: [],
  },
  CODE_MISSING_PHONE: {
    message: { en: 'Add a phone number.', 'pt-BR': 'Adicione um telefone.' },
    params: [],
  },
  CODE_MISSING_SUMMARY: {
    message: { en: 'Add a professional summary.', 'pt-BR': 'Adicione um resumo profissional.' },
    params: [],
  },
  CODE_MISSING_JOB_TITLE: {
    message: { en: 'Add your job title.', 'pt-BR': 'Adicione seu cargo.' },
    params: [],
  },
  CODE_MISSING_EXPERIENCE: {
    message: {
      en: 'Add at least one work experience.',
      'pt-BR': 'Adicione ao menos uma experiência profissional.',
    },
    params: [],
  },
  CODE_MISSING_EDUCATION: {
    message: { en: 'Add your education.', 'pt-BR': 'Adicione sua formação acadêmica.' },
    params: [],
  },
  CODE_MISSING_SKILLS: {
    message: { en: 'Add some skills.', 'pt-BR': 'Adicione algumas habilidades.' },
    params: [],
  },
  CODE_MISSING_DATES: {
    message: {
      en: '{count} entries are missing a start date.',
      'pt-BR': '{count} itens estão sem data de início.',
    },
    params: ['count'],
  },
  CODE_SUMMARY_TOO_SHORT: {
    message: {
      en: 'Your summary is short ({currentLength}/{minimumLength} characters).',
      'pt-BR': 'Seu resumo está curto ({currentLength}/{minimumLength} caracteres).',
    },
    params: ['currentLength', 'minimumLength'],
  },
  CODE_DUPLICATE_SKILL: {
    message: { en: 'Duplicate skill: {skill}.', 'pt-BR': 'Habilidade duplicada: {skill}.' },
    params: ['skill'],
  },
  CODE_TEMPORAL_OVERLAP: {
    message: {
      en: 'Your experience dates overlap.',
      'pt-BR': 'Suas datas de experiência se sobrepõem.',
    },
    params: [],
  },
  // ── Structural ATS (advisory) ──────────────────────────────────────
  CODE_MISSING_MANDATORY_SECTION: {
    message: {
      en: 'Missing a required section: {sectionKind}.',
      'pt-BR': 'Falta uma seção obrigatória: {sectionKind}.',
    },
    params: ['sectionKind'],
  },
  CODE_MISSING_WEIGHTED_FIELDS: {
    message: {
      en: 'Fill in {missingFields} in your {sectionKind} section.',
      'pt-BR': 'Preencha {missingFields} na seção {sectionKind}.',
    },
    params: ['sectionKind', 'missingFields'],
  },
  // ── Content quality (AI) — fixed category labels ───────────────────
  AI_VAGUE_BULLET: {
    message: {
      en: 'This bullet is too vague — be specific.',
      'pt-BR': 'Este item está vago — seja específico.',
    },
    params: [],
  },
  AI_NO_METRIC: {
    message: {
      en: 'This bullet lacks a measurable result.',
      'pt-BR': 'Este item não tem um resultado mensurável.',
    },
    params: [],
  },
  AI_WEAK_VERB: {
    message: {
      en: 'Start with a stronger action verb.',
      'pt-BR': 'Comece com um verbo de ação mais forte.',
    },
    params: [],
  },
  AI_OTHER: {
    message: { en: 'Content quality issue.', 'pt-BR': 'Ponto de atenção no conteúdo.' },
    params: [],
  },
} as const satisfies QualityIssueDictionary;

export type QualityIssueCode = keyof typeof QUALITY_ISSUE_DICTIONARY;

/** Render an issue code into a localised label. Mirrors
 * `renderSuccessMessage`. Unknown codes fall back to the raw code so a
 * missing entry is visible rather than silent. */
export function renderQualityIssue(
  code: QualityIssueCode | string,
  params: Record<string, string | number | boolean> = {},
  locale: Locale = 'en',
): string {
  const entry = (QUALITY_ISSUE_DICTIONARY as QualityIssueDictionary)[code];
  if (!entry) {
    return code;
  }
  const template = entry.message[locale] ?? entry.message.en;
  return interpolate(template, params);
}

function interpolate(template: string, params: Record<string, string | number | boolean>): string {
  return template.replace(/\{\s*(\w+)\s*\}/g, (_, key) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}
