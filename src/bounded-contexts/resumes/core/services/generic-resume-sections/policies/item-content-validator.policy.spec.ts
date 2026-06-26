import { describe, expect, it } from 'bun:test';
import { InvalidEmploymentTypeForInternRoleException } from '@/bounded-contexts/resumes/domain/exceptions';
import { SectionDefinitionZodFactory } from '../../section-definition-zod.factory';
import { ItemContentValidatorPolicy } from './item-content-validator.policy';

describe('ItemContentValidatorPolicy — intern employment-type invariant', () => {
  const policy = new ItemContentValidatorPolicy(new SectionDefinitionZodFactory());

  const definition = {
    schemaVersion: 1,
    kind: 'WORK_EXPERIENCE',
    fields: [
      { key: 'role', type: 'string', required: true, semanticRole: 'JOB_TITLE' },
      {
        key: 'roleSeniority',
        type: 'enum',
        required: false,
        nullable: true,
        semanticRole: 'SENIORITY_LEVEL',
        enum: ['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'TRAINEE'],
      },
      {
        key: 'employmentType',
        type: 'enum',
        required: false,
        semanticRole: 'EMPLOYMENT_TYPE',
        enum: ['FULL_TIME', 'INTERNSHIP', 'VOLUNTEER'],
      },
    ],
  };

  const validate = (content: Record<string, unknown>) => policy.validate(definition, content);

  it('rejects an INTERN role paired with a non-Internship employment type', () => {
    expect(() =>
      validate({
        role: 'Estagiário de Marketing',
        roleSeniority: 'INTERN',
        employmentType: 'FULL_TIME',
      }),
    ).toThrow(InvalidEmploymentTypeForInternRoleException);
  });

  it('accepts INTERN with Internship', () => {
    const data = validate({
      role: 'Estagiário de Marketing',
      roleSeniority: 'INTERN',
      employmentType: 'INTERNSHIP',
    });
    expect(data.employmentType).toBe('INTERNSHIP');
  });

  it('does not block an INTERN role with no employment type (app auto-sets it)', () => {
    expect(() =>
      validate({ role: 'Estagiário de Marketing', roleSeniority: 'INTERN' }),
    ).not.toThrow();
  });

  it('leaves non-INTERN seniorities unconstrained (JUNIOR + Full-time)', () => {
    expect(() =>
      validate({ role: 'Analista Júnior', roleSeniority: 'JUNIOR', employmentType: 'FULL_TIME' }),
    ).not.toThrow();
  });

  it('does not constrain TRAINEE (CLT, not an internship)', () => {
    expect(() =>
      validate({
        role: 'Trainee de Vendas',
        roleSeniority: 'TRAINEE',
        employmentType: 'FULL_TIME',
      }),
    ).not.toThrow();
  });
});
