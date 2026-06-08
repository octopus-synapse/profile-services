/**
 * Onboarding → résumé mapping (pure, no persistence).
 *
 * Single source of truth for turning a saved {@link OnboardingProgressData}
 * into résumé-shaped data. Two consumers share it so the live preview and
 * the final résumé (created on completion) never drift:
 *
 *   - `CompleteOnboardingFromProgressUseCase` uses {@link extractOnboardingDataFromProgress}
 *     + {@link deriveJobTitle} (then validates + persists via Prisma).
 *   - `RenderOnboardingPreviewUseCase` uses {@link buildGenericResumeFromOnboarding}
 *     to render an in-memory {@link GenericResume} — no DB, works mid-flow.
 */

import type { GenericResume, GenericResumeSection } from '@/shared-kernel/schemas/sections';
import type { OnboardingProgressData } from '../../domain/ports/onboarding-progress.port';

const WORK_EXPERIENCE_SECTION = 'work_experience_v1';
const ROLE_KEYS = ['role', 'jobTitle', 'title', 'position'] as const;

/** A fixed timestamp keeps the mapped résumé deterministic — the values
 *  never surface (the compiler stamps its own `generatedAt`). */
const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

export interface OnboardingSectionData {
  sectionTypeKey: string;
  items: { content: Record<string, unknown> }[];
  noData: boolean;
}

export interface ExtractedOnboardingData {
  username?: string | null;
  personalInfo?: Record<string, unknown>;
  professionalProfile?: Record<string, unknown>;
  resumeStyleId?: string | null;
  sections: OnboardingSectionData[];
}

/** Normalize the loosely-typed progress `sections` into `{ content }` items.
 *  Mirrors the legacy private method that lived in the complete use case. */
export function mapProgressSections(progress: OnboardingProgressData): OnboardingSectionData[] {
  return (progress.sections ?? []).map((s) => ({
    sectionTypeKey: s.sectionTypeKey,
    items: (s.items ?? []).map((item) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return { content: (obj.content as Record<string, unknown>) ?? obj };
      }
      return { content: {} };
    }),
    noData: s.noData ?? false,
  }));
}

/** Gather the résumé-relevant fields out of saved progress. Lenient: no
 *  validation here (the completion path validates separately) so the
 *  preview can render whatever the user has filled so far. */
export function extractOnboardingDataFromProgress(
  progress: OnboardingProgressData,
): ExtractedOnboardingData {
  return {
    username: progress.username ?? null,
    personalInfo: progress.personalInfo as Record<string, unknown> | undefined,
    professionalProfile: progress.professionalProfile as Record<string, unknown> | undefined,
    resumeStyleId: progress.resumeStyleId ?? null,
    sections: mapProgressSections(progress),
  };
}

/** Pick the résumé job title from the current work experience: the entry
 *  with no end date (the `allowPresentFlag` convention), else the first. */
export function deriveJobTitle(data: {
  sections?: ReadonlyArray<{ sectionTypeKey: string; items?: ReadonlyArray<unknown> }>;
}): string | undefined {
  const section = data.sections?.find((s) => s.sectionTypeKey === WORK_EXPERIENCE_SECTION);
  const items = section?.items ?? [];
  const contents = items.map((item) => {
    const obj = item as Record<string, unknown>;
    return (obj.content as Record<string, unknown> | undefined) ?? obj;
  });
  const current = contents.find((c) => !c.endDate) ?? contents[0];
  if (!current) return undefined;
  for (const key of ROLE_KEYS) {
    const value = current[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** Derive a semantic kind from a section type key (`work_experience_v1`
 *  → `WORK_EXPERIENCE`). Only `SUMMARY`/`OBJECTIVE` are special-cased by
 *  the compiler; everything else renders generically, so an approximate
 *  derived kind is safe (the compiler binds by `sectionTypeKey` first). */
function deriveSemanticKind(sectionTypeKey: string): string {
  return sectionTypeKey.replace(/_v\d+$/i, '').toUpperCase();
}

function humanize(sectionTypeKey: string): string {
  const words = sectionTypeKey.replace(/_v\d+$/i, '').replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface BuildGenericResumeOptions {
  /** Section types for the locale — supplies localized section titles. */
  readonly sectionTypes: ReadonlyArray<{ key: string; title: string }>;
}

/**
 * Build an in-memory {@link GenericResume} from extracted onboarding data.
 * Mirrors the shape `buildSampleResume()` produces so it flows through the
 * exact same DSL compile + render pipeline. Empty / "I have none" sections
 * are dropped — the preview shows only real data.
 */
export function buildGenericResumeFromOnboarding(
  data: ExtractedOnboardingData,
  opts: BuildGenericResumeOptions,
): GenericResume {
  const personal = (data.personalInfo ?? {}) as Record<string, unknown>;
  const prof = (data.professionalProfile ?? {}) as Record<string, unknown>;
  const titleByKey = new Map(opts.sectionTypes.map((t) => [t.key, t.title] as const));

  const sections: GenericResumeSection[] = data.sections
    .filter((s) => !s.noData && s.items.length > 0)
    .map((s, idx) => ({
      id: `onboarding-${s.sectionTypeKey}`,
      resumeId: 'onboarding-preview',
      sectionTypeId: `onboarding-${s.sectionTypeKey}-type`,
      sectionTypeKey: s.sectionTypeKey,
      semanticKind: deriveSemanticKind(s.sectionTypeKey),
      title: titleByKey.get(s.sectionTypeKey) ?? humanize(s.sectionTypeKey),
      titleOverride: null,
      isVisible: true,
      order: idx,
      items: s.items.map((item, i) => ({
        id: `onboarding-${s.sectionTypeKey}-${i}`,
        order: i,
        isVisible: true,
        content: item.content,
        createdAt: FIXED_DATE,
        updatedAt: FIXED_DATE,
      })),
    }));

  return {
    id: 'onboarding-preview',
    userId: 'onboarding-preview',
    title: str(personal.fullName),
    summary: str(prof.summary),
    fullName: str(personal.fullName),
    jobTitle: deriveJobTitle(data) ?? str(prof.headline),
    phone: str(personal.phone),
    location: str(personal.location),
    linkedin: str(prof.linkedin),
    github: str(prof.github),
    website: str(prof.website),
    sections,
    style: null,
    customTheme: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
  };
}
