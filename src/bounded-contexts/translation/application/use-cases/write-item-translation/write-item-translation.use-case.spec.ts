import { describe, expect, it } from 'bun:test';
import type { Locale } from '@packages/i18n';
import { hashSource, type TranslationEnvelope } from '@/shared-kernel/i18n/translation-envelope';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { SEMANTIC_ROLE } from '@/shared-kernel/schemas/sections/semantic-role.const';
import {
  ResumeTranslationStorePort,
  type TranslatableResume,
} from '../../../domain/ports/resume-translation-store.port';
import { WriteItemTranslationUseCase } from './write-item-translation.use-case';

class MemoryStore extends ResumeTranslationStorePort {
  writes: Array<{ itemId: string; locale: Locale; envelope: TranslationEnvelope }> = [];
  constructor(private readonly resume: TranslatableResume) {
    super();
  }
  async load() {
    return this.resume;
  }
  async saveItemTranslation(itemId: string, locale: Locale, envelope: TranslationEnvelope) {
    this.writes.push({ itemId, locale, envelope });
  }
  async saveResumeTranslation() {}
}

const resume: TranslatableResume = {
  id: 'r1',
  userId: 'u1',
  language: 'pt-BR',
  prose: { summary: null, headline: null, jobTitle: null },
  translations: null,
  sections: [
    {
      sectionTypeKey: 'work_experience_v1',
      fields: [
        { key: 'role', semanticRole: SEMANTIC_ROLE.JOB_TITLE },
        { key: 'company', semanticRole: SEMANTIC_ROLE.ORGANIZATION },
      ],
      items: [{ id: 'i1', content: { role: 'Engenheira', company: 'Acme' }, translations: null }],
    },
  ],
};

describe('WriteItemTranslationUseCase', () => {
  it("stores the person's copy with the origin they chose and the canonical hash of the moment", async () => {
    const store = new MemoryStore(resume);
    const useCase = new WriteItemTranslationUseCase(
      store,
      stubLogger,
      () => new Date('2026-09-03T00:00:00Z'),
    );
    await useCase.execute({
      resumeId: 'r1',
      userId: 'u1',
      itemId: 'i1',
      locale: 'en',
      data: { role: 'Engineer', company: 'Should be ignored' },
      origin: 'manual',
    });
    const write = store.writes[0]!;
    expect(write.envelope.origin).toBe('manual');
    expect(write.envelope.data).toEqual({ role: 'Engineer' }); // only policy-allowed keys
    expect(write.envelope.sourceHash).toBe(hashSource({ role: 'Engenheira' }));
  });

  it('refuses to write the canonical locale as a copy', async () => {
    const useCase = new WriteItemTranslationUseCase(new MemoryStore(resume), stubLogger);
    await expect(
      useCase.execute({
        resumeId: 'r1',
        userId: 'u1',
        itemId: 'i1',
        locale: 'pt-BR',
        data: {},
        origin: 'manual',
      }),
    ).rejects.toThrow();
  });

  it("refuses another user's résumé", async () => {
    const useCase = new WriteItemTranslationUseCase(new MemoryStore(resume), stubLogger);
    await expect(
      useCase.execute({
        resumeId: 'r1',
        userId: 'intruder',
        itemId: 'i1',
        locale: 'en',
        data: {},
        origin: 'manual',
      }),
    ).rejects.toThrow();
  });
});
