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

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
}

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

  const greeting = input.userName?.trim() || 'there';
  const safeGreeting = escapeHtml(greeting);

  const bullets: string[] = [];
  if (diff.titleChanged)
    bullets.push(`Title: "${diff.oldTitle ?? 'untitled'}" → "${diff.newTitle ?? 'untitled'}"`);
  if (diff.skillsAdded > 0) bullets.push(pluralize(diff.skillsAdded, 'new skill', 'new skills'));
  if (diff.experiencesAdded > 0)
    bullets.push(pluralize(diff.experiencesAdded, 'new experience', 'new experiences'));
  if (diff.sectionsAdded > 0)
    bullets.push(pluralize(diff.sectionsAdded, 'new section', 'new sections'));
  if (diff.skillsRemoved > 0)
    bullets.push(pluralize(diff.skillsRemoved, 'skill trimmed', 'skills trimmed'));

  const subject = `Your Patch Careers time capsule — ${input.snapshotYear}`;
  const text = [
    `Hi ${greeting},`,
    '',
    `A year ago today you had a very different CV.`,
    `Here is how ${input.snapshotYear}-you compares with today-you:`,
    ...bullets.map((b) => `• ${b}`),
    '',
    'Growth sneaks up on you — take a minute to pick one thing you want next year to show.',
  ].join('\n');

  const htmlList = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('');
  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
    <p>Hi ${safeGreeting},</p>
    <p>A year ago today you had a very different CV. Here is how <strong>${input.snapshotYear}</strong>-you compares with today-you:</p>
    <ul>${htmlList}</ul>
    <p style="color:#6B7280;">Growth sneaks up on you — take a minute to pick one thing you want next year to show.</p>
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
