import type { Locale } from '@packages/i18n';
import { resolveStoredItem } from '@/shared-kernel/i18n/translation-envelope';
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
  const { content: resolved, meta } = resolveStoredItem(
    content,
    item.translations,
    canonical,
    target,
  );
  void section;
  // The raw map is for `?locale=all`; a resolved read hides it.
  return { ...item, content: resolved, translations: null, ...meta } as SectionItemDto;
}
