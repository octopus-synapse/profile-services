import { describe, expect, it } from 'bun:test';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { PrismaResumeVersionsRepository } from './prisma-resume-versions.repository';

describe('PrismaResumeVersionsRepository', () => {
  it('loads reviewed and derived prose in the target locale for tailoring', async () => {
    const prisma = {
      resume: {
        findUnique: async () => ({
          id: 'resume-1',
          userId: 'user-1',
          language: 'pt-BR',
          summary: 'Resumo',
          jobTitle: 'Engenheira',
          primaryStack: ['TypeScript'],
          translations: {
            en: {
              data: { summary: 'Summary', jobTitle: 'Engineer' },
              sourceHash: 'hash',
              translatedAt: '2026-09-21T00:00:00Z',
              origin: 'derived',
            },
          },
          resumeSections: [
            {
              sectionType: { key: 'work_experience_v1', semanticKind: 'WORK_EXPERIENCE' },
              items: [
                {
                  id: 'item-1',
                  content: { company: 'Acme', description: 'Liderei a migração.' },
                  translations: {
                    en: {
                      data: { description: 'Led the migration.' },
                      sourceHash: 'hash',
                      translatedAt: '2026-09-21T00:00:00Z',
                      origin: 'manual',
                    },
                  },
                },
              ],
            },
          ],
        }),
      },
    } as unknown as PrismaService;
    const repository = new PrismaResumeVersionsRepository(prisma, stubLogger);
    const resume = await repository.findResumeForTailor('resume-1', 'en');
    expect(resume).toMatchObject({
      summary: 'Summary',
      jobTitle: 'Engineer',
      resumeSections: [
        { items: [{ content: { company: 'Acme', description: 'Led the migration.' } }] },
      ],
    });
  });
});
