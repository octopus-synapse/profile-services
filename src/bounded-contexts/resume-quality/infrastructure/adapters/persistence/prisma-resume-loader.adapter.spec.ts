import { describe, expect, it } from 'bun:test';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { PrismaResumeLoader } from './prisma-resume-loader.adapter';

/** Builds a stub PrismaService whose `resume.findUnique` returns `row`. */
function loaderFor(row: unknown): PrismaResumeLoader {
  const prisma = {
    resume: { findUnique: async () => row },
  } as unknown as PrismaService;
  return new PrismaResumeLoader(prisma);
}

const SAMPLE_ROW = {
  fullName: 'Alex Morgan',
  summary: 'Backend engineer.',
  jobTitle: 'Senior Engineer',
  phone: '+55 11 90000-0000',
  language: 'pt-br',
  resumeSections: [
    {
      sectionType: { semanticKind: 'WORK_EXPERIENCE' },
      items: [
        {
          content: {
            company: 'Acme',
            role: 'Senior Engineer',
            startDate: '2022-01-01',
            endDate: '2024-01-01',
            description: 'Led the payments platform rewrite.',
            achievements: ['Cut latency 40%', '  ', 'Mentored 3 juniors'],
          },
        },
      ],
    },
    {
      sectionType: { semanticKind: 'EDUCATION' },
      items: [{ content: { institution: 'UFSCar', startDate: '2014-01-01', endDate: '2018-12-01' } }],
    },
    {
      sectionType: { semanticKind: 'SKILL_SET' },
      items: [{ content: { name: 'Go' } }, { content: { name: '' } }, { content: { name: 'Rust' } }],
    },
    {
      sectionType: { semanticKind: 'SUMMARY' },
      items: [{ content: { text: 'Pragmatic engineer who ships.' } }],
    },
    {
      sectionType: { semanticKind: 'PROJECT' },
      items: [{ content: { name: 'OSS tool', description: 'A CLI', highlights: ['1k stars'] } }],
    },
  ],
};

describe('PrismaResumeLoader projection', () => {
  it('returns null when the resume is absent', async () => {
    expect(await loaderFor(null).load('missing')).toBeNull();
  });

  it('projects WORK_EXPERIENCE into experiences with parsed dates', async () => {
    const r = await loaderFor(SAMPLE_ROW).load('r1');
    expect(r?.experiences).toHaveLength(1);
    expect(r?.experiences[0]).toMatchObject({ role: 'Senior Engineer', company: 'Acme' });
    expect(r?.experiences[0]?.startedAt).toEqual(new Date('2022-01-01'));
    expect(r?.experiences[0]?.endedAt).toEqual(new Date('2024-01-01'));
  });

  it('projects EDUCATION with start/end dates', async () => {
    const r = await loaderFor(SAMPLE_ROW).load('r1');
    expect(r?.educations[0]).toMatchObject({ institution: 'UFSCar' });
    expect(r?.educations[0]?.startedAt).toEqual(new Date('2014-01-01'));
  });

  it('drops blank skills and keeps the rest', async () => {
    const r = await loaderFor(SAMPLE_ROW).load('r1');
    expect(r?.skills).toEqual([{ name: 'Go' }, { name: 'Rust' }]);
  });

  it('collects real bullets from experience, summary and project (skipping blanks)', async () => {
    const r = await loaderFor(SAMPLE_ROW).load('r1');
    const texts = (r?.bullets ?? []).map((b) => b.text);
    expect(texts).toContain('Led the payments platform rewrite.');
    expect(texts).toContain('Cut latency 40%');
    expect(texts).toContain('Mentored 3 juniors');
    expect(texts).toContain('Pragmatic engineer who ships.');
    expect(texts).toContain('A CLI');
    expect(texts).toContain('1k stars');
    expect(texts).not.toContain('  '); // whitespace achievement dropped
    expect(r?.bullets?.every((b) => b.id && b.sectionKind)).toBe(true);
  });

  it('forwards the resume language', async () => {
    const r = await loaderFor(SAMPLE_ROW).load('r1');
    expect(r?.language).toBe('pt-br');
  });
});
