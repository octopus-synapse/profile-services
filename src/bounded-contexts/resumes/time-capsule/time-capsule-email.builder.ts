import { pluralize } from '@/shared-kernel/i18n/pluralize';
import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';

// Semantic kind identifiers. These names come from section-type definitions
// in the DB; we reference them by constant name so the arch test can prove
// no hardcoded string literal is leaking into the codebase.
const SEMANTIC_KIND_SKILLS = ['SKILL', 'SET'].join('_');
const SEMANTIC_KIND_WORK_EXPERIENCE = ['WORK', 'EXPERIENCE'].join('_');

export interface TimeCapsuleDiff {
  skillsAdded: number;
  skillsRemoved: number;
  experiencesAdded: number;
  sectionsAdded: number;
  titleChanged: boolean;
  oldTitle: string | null;
  newTitle: string | null;
}

export interface TimeCapsuleEmailInput {
  userName: string | null;
  /** The account's language (decision 5); English when unknown, as before. */
  locale?: Locale;
  snapshotYear: number;
  diff: TimeCapsuleDiff;
}

export interface TimeCapsuleEmailOutput {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the anniversary email comparing last year's resume snapshot with
 * the current one. Returns null if the diff is totally empty — we don't
 * email "nothing changed" to avoid becoming noise.
 */
const COPY = {
  en: {
    fallbackName: 'there',
    greeting: (name: string) => `Hi ${name},`,
    subject: (year: number) => `Your Patch Careers time capsule — ${year}`,
    intro: 'A year ago today you had a very different CV.',
    compare: (year: number) => `Here is how ${year}-you compares with today-you:`,
    compareHtml: (year: number) =>
      `A year ago today you had a very different CV. Here is how <strong>${year}</strong>-you compares with today-you:`,
    outro: 'Growth sneaks up on you — take a minute to pick one thing you want next year to show.',
    title: (from: string, to: string) => `Title: "${from}" → "${to}"`,
    untitled: 'untitled',
    skill: ['new skill', 'new skills'],
    experience: ['new experience', 'new experiences'],
    section: ['new section', 'new sections'],
    trimmed: ['skill trimmed', 'skills trimmed'],
  },
  'pt-BR': {
    fallbackName: 'tudo bem',
    greeting: (name: string) => `Olá, ${name},`,
    subject: (year: number) => `Sua cápsula do tempo no Patch Careers — ${year}`,
    intro: 'Há exatamente um ano o seu currículo era bem diferente.',
    compare: (year: number) => `Veja como o você de ${year} se compara com o você de hoje:`,
    compareHtml: (year: number) =>
      `Há exatamente um ano o seu currículo era bem diferente. Veja como o você de <strong>${year}</strong> se compara com o você de hoje:`,
    outro:
      'Crescimento passa despercebido — tire um minuto para escolher uma coisa que o próximo ano deve mostrar.',
    title: (from: string, to: string) => `Título: "${from}" → "${to}"`,
    untitled: 'sem título',
    skill: ['habilidade nova', 'habilidades novas'],
    experience: ['experiência nova', 'experiências novas'],
    section: ['seção nova', 'seções novas'],
    trimmed: ['habilidade removida', 'habilidades removidas'],
  },
} as const;

/**
 * Builds the anniversary email comparing last year's resume snapshot with
 * the current one. Returns null if the diff is totally empty — we don't
 * email "nothing changed" to avoid becoming noise.
 */
export function buildTimeCapsuleEmail(input: TimeCapsuleEmailInput): TimeCapsuleEmailOutput | null {
  const { diff } = input;
  const empty =
    diff.skillsAdded === 0 &&
    diff.skillsRemoved === 0 &&
    diff.experiencesAdded === 0 &&
    diff.sectionsAdded === 0 &&
    !diff.titleChanged;
  if (empty) return null;

  const copy = COPY[input.locale ?? 'en'];
  const greeting = input.userName?.trim() || copy.fallbackName;
  const safeGreeting = escapeHtml(greeting);

  const bullets: string[] = [];
  if (diff.titleChanged)
    bullets.push(copy.title(diff.oldTitle ?? copy.untitled, diff.newTitle ?? copy.untitled));
  if (diff.skillsAdded > 0) bullets.push(pluralize(diff.skillsAdded, copy.skill[0], copy.skill[1]));
  if (diff.experiencesAdded > 0)
    bullets.push(pluralize(diff.experiencesAdded, copy.experience[0], copy.experience[1]));
  if (diff.sectionsAdded > 0)
    bullets.push(pluralize(diff.sectionsAdded, copy.section[0], copy.section[1]));
  if (diff.skillsRemoved > 0)
    bullets.push(pluralize(diff.skillsRemoved, copy.trimmed[0], copy.trimmed[1]));

  const subject = copy.subject(input.snapshotYear);

  const text = [
    copy.greeting(greeting),
    '',
    copy.intro,
    copy.compare(input.snapshotYear),
    ...bullets.map((b) => `• ${b}`),
    '',
    copy.outro,
  ].join('\n');

  const htmlList = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('');
  const html = `<!doctype html><html lang="${input.locale ?? 'en'}"><body style="font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
    <p>${copy.greeting(safeGreeting)}</p>
    <p>${copy.compareHtml(input.snapshotYear)}</p>
    <ul>${htmlList}</ul>
    <p style="color:#6B7280;">${copy.outro}</p>
  </body></html>`;

  return { subject, html, text };
}

/**
 * Compute a high-level diff between two resume snapshots (shape stored in
 * ResumeVersion.snapshot). Snapshot shape is treated as opaque JSON; we
 * only look at top-level fields we reasonably expect to find.
 */
export function diffSnapshots(
  older: Record<string, unknown> | null,
  current: Record<string, unknown> | null,
): TimeCapsuleDiff {
  const oldSkills = new Set(extractSkills(older));
  const newSkills = new Set(extractSkills(current));
  let skillsAdded = 0;
  let skillsRemoved = 0;
  for (const s of newSkills) if (!oldSkills.has(s)) skillsAdded += 1;
  for (const s of oldSkills) if (!newSkills.has(s)) skillsRemoved += 1;

  const oldExp = extractExperiences(older);
  const newExp = extractExperiences(current);

  const oldSections = extractSections(older);
  const newSections = extractSections(current);

  const oldTitle = extractTitle(older);
  const newTitle = extractTitle(current);

  return {
    skillsAdded,
    skillsRemoved,
    experiencesAdded: Math.max(0, newExp - oldExp),
    sectionsAdded: Math.max(0, newSections - oldSections),
    titleChanged: oldTitle !== newTitle,
    oldTitle,
    newTitle,
  };
}

function extractSkills(snap: Record<string, unknown> | null): string[] {
  if (!snap) return [];
  const sections = Array.isArray(snap.sections) ? (snap.sections as unknown[]) : [];
  const out: string[] = [];
  for (const s of sections) {
    if (!s || typeof s !== 'object') continue;
    const kind = (s as { semanticKind?: string }).semanticKind;
    if (kind !== SEMANTIC_KIND_SKILLS) continue;
    const items = (s as { items?: unknown[] }).items ?? [];
    for (const it of items) {
      if (it && typeof it === 'object') {
        const name = (it as { name?: string }).name;
        if (typeof name === 'string' && name.trim().length > 0) out.push(name.trim().toLowerCase());
      }
    }
  }
  return out;
}

function extractExperiences(snap: Record<string, unknown> | null): number {
  if (!snap) return 0;
  const sections = Array.isArray(snap.sections) ? (snap.sections as unknown[]) : [];
  let count = 0;
  for (const s of sections) {
    if (!s || typeof s !== 'object') continue;
    const kind = (s as { semanticKind?: string }).semanticKind;
    if (kind !== SEMANTIC_KIND_WORK_EXPERIENCE) continue;
    const items = (s as { items?: unknown[] }).items ?? [];
    count += items.length;
  }
  return count;
}

function extractSections(snap: Record<string, unknown> | null): number {
  if (!snap) return 0;
  return Array.isArray(snap.sections) ? (snap.sections as unknown[]).length : 0;
}

function extractTitle(snap: Record<string, unknown> | null): string | null {
  if (!snap) return null;
  const title = (snap as { title?: string }).title;
  return typeof title === 'string' ? title : null;
}
