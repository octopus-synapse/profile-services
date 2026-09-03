import type { Locale } from '@packages/i18n';
import { hashSource, resolveItemForLocale } from '@/shared-kernel/i18n/translation-envelope';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver.util';
import { ResumeOwnershipPolicy } from '../policies/resume-ownership.policy';
import {
  GenericResumeSectionsRepositoryPort,
  type ResumeSectionDto,
  type SectionItemDto,
} from '../ports/generic-resume-sections-repository.port';

/**
 * `locale` selects which language version of the items comes back
 * (ADR-003 / ADR-0011): omitted or the canonical locale → the text as written;
 * the other locale → the derived copy merged over the canonical content, with
 * `contentLocale`/`origin`/`translationState` per item; `'all'` → the raw
 * rows with their `translations` map, for the editor that shows both sides.
 */
export type SectionsLocaleQuery = Locale | 'all' | undefined;

export class ListResumeSectionsUseCase {
  constructor(
    private readonly repository: GenericResumeSectionsRepositoryPort,
    private readonly ownershipPolicy: ResumeOwnershipPolicy,
  ) {}

  async execute(resumeId: string, userId: string, locale?: SectionsLocaleQuery) {
    await this.ownershipPolicy.ensureOwned(resumeId, userId);
    const sections = await this.repository.findResumeSections(resumeId);
    if (locale === 'all') return sections;

    const canonical = parseLocale(
      (await this.repository.findResumeLanguage(resumeId)) ?? undefined,
    );
    const target = locale ?? canonical;
    return sections.map((section) => ({
      ...section,
      items: section.items.map((item) => resolveItem(section, item, canonical, target)),
    }));
  }
}

function resolveItem(
  section: ResumeSectionDto,
  item: ResumeSectionDto['items'][number],
  canonical: Locale,
  target: Locale,
): SectionItemDto {
  const content = (item.content ?? {}) as Record<string, unknown>;
  // The hash the worker stored was over the translatable subset; the reader
  // does not know the policy, so staleness is judged by the worker's own
  // hash carried on the envelope against the subset it names.
  const subset = subsetNamedBy(content, item.translations, target);
  const { content: resolved, meta } = resolveItemForLocale(
    content,
    item.translations,
    canonical,
    target,
    subset ? hashSource(subset) : null,
  );
  void section;
  // The raw map is for `?locale=all`; a resolved read hides it.
  return { ...item, content: resolved, translations: null, ...meta } as SectionItemDto;
}

/** The canonical values of the keys the envelope translated — what its hash was taken over. */
function subsetNamedBy(
  content: Record<string, unknown>,
  translations: unknown,
  locale: Locale,
): Record<string, unknown> | null {
  const entry =
    translations && typeof translations === 'object'
      ? (translations as Record<string, { data?: Record<string, unknown> }>)[locale]
      : undefined;
  if (!entry?.data) return null;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(entry.data)) {
    const value = content[key];
    if (typeof value === 'string' && value.trim()) out[key] = value;
    else if (Array.isArray(value)) out[key] = value.filter((v) => typeof v === 'string');
  }
  return out;
}
