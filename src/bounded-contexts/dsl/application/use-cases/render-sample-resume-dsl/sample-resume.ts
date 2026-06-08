/**
 * Built-in sample résumé used by the *generic* style preview.
 *
 * The résumé-style picker (onboarding + Resume tab) needs to render a
 * preview of a candidate style before the user has a primary résumé.
 * A real résumé can't be loaded in that moment, so we render this baked
 * sample through the same Typst pipeline, overlaying the candidate
 * style's `tokens` + `layout`. The content keys (`role`, `company`,
 * `degree`, `name`, `startDate`/`endDate`/`isCurrent`, `description`)
 * are exactly the ones the Typst `item-fields.typ` extractor reads, so
 * the preview shows realistic content in the chosen style.
 *
 * Locale-aware: section titles and copy switch on `pt-BR` / `en`.
 */

import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import type { GenericResume, GenericResumeSection } from '@/shared-kernel/schemas/sections';
import type { ResumeDsl } from '../../../domain/schemas/dsl';

/**
 * A complete, validation-passing DSL that lays out the sample sections.
 * Token values here are placeholders — the preview use case overlays the
 * candidate style's `tokens`/`layout` before compiling, so these only
 * matter when a style omits a token group.
 */
export const SAMPLE_RESUME_DSL: ResumeDsl = {
  version: '1.0.0',
  layout: {
    type: 'single-column',
    paperSize: 'a4',
    margins: 'normal',
    pageBreakBehavior: 'auto',
  },
  tokens: {
    typography: {
      fontFamily: { heading: 'inter', body: 'inter' },
      fontSize: 'base',
      headingStyle: 'bold',
    },
    colors: {
      colors: {
        primary: '#111827',
        secondary: '#4b5563',
        background: '#ffffff',
        surface: '#f9fafb',
        text: { primary: '#111827', secondary: '#4b5563', accent: '#2563eb' },
        border: '#e5e7eb',
        divider: '#f3f4f6',
      },
      borderRadius: 'sm',
      shadows: 'none',
    },
    spacing: { density: 'comfortable', sectionGap: 'md', itemGap: 'sm', contentPadding: 'md' },
  },
  sections: [
    { id: 'summary', visible: true, order: 0, column: 'main' },
    { id: 'work_experience_v1', visible: true, order: 1, column: 'main' },
    { id: 'education_v1', visible: true, order: 2, column: 'main' },
    { id: 'skill_set_v1', visible: true, order: 3, column: 'main' },
  ],
};

type SampleCopy = {
  jobTitle: string;
  summary: string;
  location: string;
  titles: { experience: string; education: string; skills: string };
  experience: ReadonlyArray<Record<string, unknown>>;
  education: ReadonlyArray<Record<string, unknown>>;
  skills: ReadonlyArray<string>;
};

const COPY: Record<Locale, SampleCopy> = {
  'pt-BR': {
    jobTitle: 'Engenheira de Software',
    summary:
      'Engenheira de software com 6 anos de experiência construindo produtos web escaláveis. Foco em qualidade, performance e colaboração entre times.',
    location: 'São Paulo, SP',
    titles: { experience: 'Experiência', education: 'Formação', skills: 'Competências' },
    experience: [
      {
        role: 'Engenheira de Software Sênior',
        company: 'Nimbus Tecnologia',
        startDate: '2022-03-01',
        isCurrent: true,
        description:
          'Lidero o time de plataforma, entregando APIs de alta disponibilidade e reduzindo o tempo de deploy em 40%.',
      },
      {
        role: 'Engenheira de Software',
        company: 'Aurora Labs',
        startDate: '2019-01-01',
        endDate: '2022-02-01',
        description:
          'Desenvolvi funcionalidades do produto principal e mentorei pessoas desenvolvedoras juniores.',
      },
    ],
    education: [
      {
        degree: 'Bacharelado em Ciência da Computação',
        institution: 'Universidade de São Paulo',
        startDate: '2014-02-01',
        endDate: '2018-12-01',
      },
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
  },
  en: {
    jobTitle: 'Software Engineer',
    summary:
      'Software engineer with 6 years of experience building scalable web products. Focused on quality, performance, and cross-team collaboration.',
    location: 'San Francisco, CA',
    titles: { experience: 'Experience', education: 'Education', skills: 'Skills' },
    experience: [
      {
        role: 'Senior Software Engineer',
        company: 'Nimbus Technologies',
        startDate: '2022-03-01',
        isCurrent: true,
        description:
          'Lead the platform team, shipping highly-available APIs and cutting deploy time by 40%.',
      },
      {
        role: 'Software Engineer',
        company: 'Aurora Labs',
        startDate: '2019-01-01',
        endDate: '2022-02-01',
        description: 'Built core product features and mentored junior engineers.',
      },
    ],
    education: [
      {
        degree: 'B.Sc. in Computer Science',
        institution: 'University of California, Berkeley',
        startDate: '2014-08-01',
        endDate: '2018-05-01',
      },
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
  },
};

const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

function buildSection(
  idPrefix: string,
  sectionTypeKey: string,
  semanticKind: string,
  title: string,
  order: number,
  contents: ReadonlyArray<Record<string, unknown>>,
): GenericResumeSection {
  return {
    id: `sample-${idPrefix}`,
    resumeId: 'sample-resume',
    sectionTypeId: `sample-${idPrefix}-type`,
    sectionTypeKey,
    semanticKind,
    title,
    titleOverride: null,
    isVisible: true,
    order,
    items: contents.map((content, i) => ({
      id: `sample-${idPrefix}-${i}`,
      order: i,
      isVisible: true,
      content,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    })),
  };
}

/**
 * Build the baked sample résumé for a locale. No DB access — pure data.
 * Section `sectionTypeKey`s match the DSL section `id`s in
 * {@link SAMPLE_RESUME_DSL} so the compiler fills each section with this
 * content.
 */
export function buildSampleResume(locale: Locale): GenericResume {
  const copy = COPY[locale] ?? COPY['pt-BR'];

  return {
    id: 'sample-resume',
    userId: 'sample-user',
    title: 'Sample',
    summary: copy.summary,
    fullName: 'Alex Rivera',
    jobTitle: copy.jobTitle,
    phone: '+55 11 90000-0000',
    location: copy.location,
    linkedin: 'linkedin.com/in/alex-rivera',
    github: 'github.com/alex-rivera',
    website: 'alexrivera.dev',
    sections: [
      buildSection(
        'exp',
        'work_experience_v1',
        'WORK_EXPERIENCE',
        copy.titles.experience,
        0,
        copy.experience,
      ),
      buildSection('edu', 'education_v1', 'EDUCATION', copy.titles.education, 1, copy.education),
      buildSection(
        'skill',
        'skill_set_v1',
        'SKILL_SET',
        copy.titles.skills,
        2,
        copy.skills.map((name) => ({ name })),
      ),
    ],
    style: null,
    customTheme: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
  };
}
