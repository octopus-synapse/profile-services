import { describe, expect, it } from 'bun:test';
import type { SectionAtsCatalog } from '../ports/section-ats-catalog.port';
import { type ResumeForCompleteness, scoreCompleteness } from './completeness.rules';

function base(overrides: Partial<ResumeForCompleteness> = {}): ResumeForCompleteness {
  return {
    fullName: 'Jane Doe',
    summary:
      'Senior backend engineer with 8 years experience shipping reliable services in Go and Rust.',
    jobTitle: 'Senior Backend Engineer',
    experiences: [{ startedAt: new Date('2022-01-01'), endedAt: new Date('2024-01-01') }],
    educations: [{ institution: 'UFSCar' }],
    skills: [{ name: 'Go' }],
    ...overrides,
  };
}

const CATALOG: SectionAtsCatalog = [
  {
    semanticKind: 'WORK_EXPERIENCE',
    isMandatory: true,
    fieldWeights: { ORGANIZATION: 20, JOB_TITLE: 20 },
    roleToFieldKey: { ORGANIZATION: 'company', JOB_TITLE: 'role' },
  },
];

describe('completeness — ported ATS checks', () => {
  it('emits CODE_MISSING_PHONE when a loaded phone is blank', () => {
    const result = scoreCompleteness(base({ phone: '' }));
    expect(result.issues.some((i) => i.code === 'CODE_MISSING_PHONE')).toBe(true);
  });

  it('does not check phone when the field was not loaded (undefined)', () => {
    const result = scoreCompleteness(base());
    expect(result.issues.some((i) => i.code === 'CODE_MISSING_PHONE')).toBe(false);
  });

  it('adds the phone weight when a loaded phone is present', () => {
    const withPhone = scoreCompleteness(base({ phone: '+55 11 99999-9999' }));
    const withoutPhone = scoreCompleteness(base({ phone: '' }));
    expect(withPhone.score).toBe(withoutPhone.score + 4);
  });

  it('flags a missing mandatory section against the catalog', () => {
    const result = scoreCompleteness(base({ phone: '123', sections: [] }), CATALOG);
    const issue = result.issues.find((i) => i.code === 'CODE_MISSING_MANDATORY_SECTION');
    expect(issue?.context?.sectionKey).toBe('WORK_EXPERIENCE');
  });

  it('flags an item missing weighted fields', () => {
    const result = scoreCompleteness(
      base({
        phone: '123',
        sections: [{ semanticKind: 'WORK_EXPERIENCE', items: [{ content: { company: 'Acme' } }] }],
      }),
      CATALOG,
    );
    const issue = result.issues.find((i) => i.code === 'CODE_MISSING_WEIGHTED_FIELDS');
    expect(issue).toBeDefined();
    expect(String(issue?.messageArgs?.missingFields)).toContain('role');
  });

  it('is clean when sections satisfy the catalog', () => {
    const result = scoreCompleteness(
      base({
        phone: '123',
        sections: [
          {
            semanticKind: 'WORK_EXPERIENCE',
            items: [{ content: { company: 'Acme', role: 'Engineer' } }],
          },
        ],
      }),
      CATALOG,
    );
    expect(result.issues.some((i) => i.code.startsWith('CODE_MISSING_MANDATORY'))).toBe(false);
    expect(result.issues.some((i) => i.code === 'CODE_MISSING_WEIGHTED_FIELDS')).toBe(false);
  });
});
