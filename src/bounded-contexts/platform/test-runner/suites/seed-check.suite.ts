import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { TestResult } from '../domain/ports/test-suite-runner.port';
import { runTest } from './test-helpers';

interface SeedCheck {
  label: string;
  count: () => Promise<number>;
  message: (count: number) => string;
  emptyError: string;
}

export async function runSeedCheck(
  prisma: PrismaService,
  logger: LoggerPort,
): Promise<TestResult[]> {
  const checks: SeedCheck[] = [
    {
      label: 'SectionType count',
      count: () => prisma.sectionType.count(),
      message: (n) => `Section Types seeded (${n} records)`,
      emptyError: 'No SectionType records found',
    },
    {
      label: 'OnboardingStep count',
      count: () => prisma.onboardingStep.count(),
      message: (n) => `Onboarding Steps seeded (${n} records)`,
      emptyError: 'No OnboardingStep records found',
    },
    {
      label: 'TechArea count',
      count: () => prisma.techArea.count(),
      message: (n) => `Tech Areas seeded (${n} records)`,
      emptyError: 'No TechArea records found',
    },
    {
      label: 'TechNiche count',
      count: () => prisma.techNiche.count(),
      message: (n) => `Tech Niches seeded (${n} records)`,
      emptyError: 'No TechNiche records found',
    },
    {
      label: 'TechSkill count',
      count: () => prisma.techSkill.count(),
      message: (n) => `Tech Skills seeded (${n} records)`,
      emptyError: 'No TechSkill records found',
    },
    {
      label: 'SpokenLanguage count',
      count: () => prisma.spokenLanguage.count(),
      message: (n) => `Languages seeded (${n} records)`,
      emptyError: 'No SpokenLanguage records found',
    },
    {
      label: 'ProgrammingLanguage count',
      count: () => prisma.programmingLanguage.count(),
      message: (n) => `Programming Languages seeded (${n} records)`,
      emptyError: 'No ProgrammingLanguage records found',
    },
    {
      label: 'User count',
      count: () => prisma.user.count(),
      message: (n) => `Users exist (${n} records)`,
      emptyError: 'No User records found',
    },
  ];

  const results: TestResult[] = [];
  for (const c of checks) {
    results.push(
      await runTest(
        c.label,
        async () => {
          const count = await c.count();
          if (count === 0) throw new Error(c.emptyError);
          return c.message(count);
        },
        logger,
      ),
    );
  }
  return results;
}
