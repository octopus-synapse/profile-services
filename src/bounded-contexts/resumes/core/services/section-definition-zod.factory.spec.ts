import { describe, expect, it } from 'bun:test';
import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';
import { SectionDefinitionZodFactory } from './section-definition-zod.factory';

describe('SectionDefinitionZodFactory', () => {
  const factory = new SectionDefinitionZodFactory();

  it('builds schema and validates required fields', () => {
    const schema = factory.buildSchema({
      schemaVersion: 1,
      kind: 'WORK_EXPERIENCE',
      fields: [
        {
          key: 'company',
          type: 'string',
          required: true,
          meta: { minLength: 2 },
        },
        {
          key: 'employmentType',
          type: 'enum',
          required: false,
          enum: ['Full-time', 'Part-time'],
        },
      ],
    });

    const parsed = schema.parse({
      company: 'ACME',
      employmentType: 'Full-time',
    });

    expect(parsed.company).toBe('ACME');
    expect(parsed.employmentType).toBe('Full-time');
  });

  it('rejects invalid definition', () => {
    expect(() => factory.buildSchema({ kind: 'WORK_EXPERIENCE' })).toThrow(ValidationException);
  });

  it('validates arrays and dates', () => {
    const schema = factory.buildSchema({
      schemaVersion: 1,
      kind: 'WORK_EXPERIENCE',
      fields: [
        {
          key: 'startDate',
          type: 'date',
          required: true,
        },
        {
          key: 'achievements',
          type: 'array',
          required: false,
          items: { type: 'string' },
        },
      ],
    });

    const parsed = schema.parse({
      startDate: '2025-01-01',
      achievements: ['Improved latency by 40%'],
    });

    expect(parsed.startDate).toBeInstanceOf(Date);
    expect(parsed.achievements).toEqual(['Improved latency by 40%']);
  });

  it('supports nested object and array-of-object subitems', () => {
    const schema = factory.buildSchema({
      schemaVersion: 1,
      kind: 'WORK_EXPERIENCE',
      fields: [
        {
          key: 'company',
          type: 'string',
          required: true,
        },
        {
          key: 'period',
          type: 'object',
          required: true,
          fields: [
            { key: 'start', type: 'date', required: true },
            { key: 'end', type: 'date', required: false, nullable: true },
          ],
        },
        {
          key: 'highlights',
          type: 'array',
          required: false,
          items: {
            type: 'object',
            fields: [
              { key: 'title', type: 'string', required: true },
              { key: 'impact', type: 'string', required: false },
            ],
          },
        },
      ],
    });

    const parsed = schema.parse({
      company: 'Octopus',
      period: {
        start: '2020-01-01',
        end: null,
      },
      highlights: [{ title: 'Latency -40%', impact: 'SRE gains' }],
    }) as Record<string, unknown>;

    expect(parsed.period).toBeDefined();
    expect((parsed.period as Record<string, unknown>).start).toBeInstanceOf(Date);
    expect(parsed.highlights).toEqual([{ title: 'Latency -40%', impact: 'SRE gains' }]);
  });

  it('rejects invalid nested payload', () => {
    const schema = factory.buildSchema({
      schemaVersion: 1,
      kind: 'PROJECT',
      fields: [
        {
          key: 'links',
          type: 'array',
          required: true,
          items: {
            type: 'object',
            fields: [
              { key: 'label', type: 'string', required: true },
              {
                key: 'url',
                type: 'string',
                required: true,
                meta: { format: 'uri' },
              },
            ],
          },
        },
      ],
    });

    expect(() =>
      schema.parse({
        links: [{ label: 'Repo', url: 'not-a-url' }],
      }),
    ).toThrow();
  });
});
