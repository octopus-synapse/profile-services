import { describe, expect, it } from 'bun:test';
import {
  buildDefaultDsl,
  mergeDslWithOverrides,
  type ResumeDslV2,
  ResumeDslV2Schema,
} from './resume-dsl';

describe('ResumeDslV2Schema', () => {
  it('should accept a valid DSL', () => {
    const dsl: ResumeDslV2 = {
      version: '2.0.0',
      sections: [
        { sectionTypeKey: 'work_experience_v1', order: 0, visible: true },
        { sectionTypeKey: 'education_v1', order: 1, visible: false },
      ],
    };

    const result = ResumeDslV2Schema.safeParse(dsl);

    expect(result.success).toBe(true);
  });

  it('should accept a DSL with headerOverrides', () => {
    const dsl: ResumeDslV2 = {
      version: '2.0.0',
      sections: [{ sectionTypeKey: 'skills_v1', order: 0, visible: true }],
      headerOverrides: { jobTitle: 'Senior Engineer' },
    };

    const result = ResumeDslV2Schema.safeParse(dsl);

    expect(result.success).toBe(true);
  });

  it('should accept a DSL with empty headerOverrides object', () => {
    const dsl = {
      version: '2.0.0',
      sections: [{ sectionTypeKey: 'skills_v1', order: 0, visible: true }],
      headerOverrides: {},
    };

    const result = ResumeDslV2Schema.safeParse(dsl);

    expect(result.success).toBe(true);
  });

  it('should accept a DSL with no sections', () => {
    const dsl = { version: '2.0.0', sections: [] };

    const result = ResumeDslV2Schema.safeParse(dsl);

    expect(result.success).toBe(true);
  });

  it('should reject a non-semver version', () => {
    const dsl = {
      version: 'v2',
      sections: [],
    };

    const result = ResumeDslV2Schema.safeParse(dsl);

    expect(result.success).toBe(false);
  });

  it('should reject an empty sectionTypeKey', () => {
    const dsl = {
      version: '2.0.0',
      sections: [{ sectionTypeKey: '', order: 0, visible: true }],
    };

    const result = ResumeDslV2Schema.safeParse(dsl);

    expect(result.success).toBe(false);
  });

  it('should reject duplicate section orders', () => {
    const dsl = {
      version: '2.0.0',
      sections: [
        { sectionTypeKey: 'work_experience_v1', order: 0, visible: true },
        { sectionTypeKey: 'education_v1', order: 0, visible: true },
      ],
    };

    const result = ResumeDslV2Schema.safeParse(dsl);

    expect(result.success).toBe(false);
  });

  it('should reject a negative order', () => {
    const dsl = {
      version: '2.0.0',
      sections: [{ sectionTypeKey: 'skills_v1', order: -1, visible: true }],
    };

    const result = ResumeDslV2Schema.safeParse(dsl);

    expect(result.success).toBe(false);
  });
});

describe('buildDefaultDsl', () => {
  it('should create a DSL with version 2.0.0', () => {
    const dsl = buildDefaultDsl(['work_experience_v1']);

    expect(dsl.version).toBe('2.0.0');
  });

  it('should set all sections visible', () => {
    const dsl = buildDefaultDsl(['work_experience_v1', 'education_v1']);

    expect(dsl.sections.every((s) => s.visible)).toBe(true);
  });

  it('should assign sequential orders starting at 0', () => {
    const keys = ['work_experience_v1', 'education_v1', 'skills_v1'];

    const dsl = buildDefaultDsl(keys);

    expect(dsl.sections.map((s) => s.order)).toEqual([0, 1, 2]);
  });

  it('should map sectionTypeKeys correctly', () => {
    const keys = ['work_experience_v1', 'education_v1'];

    const dsl = buildDefaultDsl(keys);

    expect(dsl.sections.map((s) => s.sectionTypeKey)).toEqual(keys);
  });

  it('should return an empty sections array for empty input', () => {
    const dsl = buildDefaultDsl([]);

    expect(dsl.sections).toEqual([]);
  });

  it('should produce a schema-valid DSL', () => {
    const dsl = buildDefaultDsl(['work_experience_v1', 'skills_v1']);

    const result = ResumeDslV2Schema.safeParse(dsl);

    expect(result.success).toBe(true);
  });
});

describe('mergeDslWithOverrides', () => {
  const base: ResumeDslV2 = {
    version: '2.0.0',
    sections: [
      { sectionTypeKey: 'work_experience_v1', order: 0, visible: true },
      { sectionTypeKey: 'education_v1', order: 1, visible: true },
      { sectionTypeKey: 'skills_v1', order: 2, visible: true },
    ],
  };

  it('should return base unchanged when overrides is empty', () => {
    const merged = mergeDslWithOverrides(base, {});

    expect(merged).toEqual(base);
  });

  it('should override version', () => {
    const merged = mergeDslWithOverrides(base, { version: '2.1.0' });

    expect(merged.version).toBe('2.1.0');
  });

  it('should override a matching section by sectionTypeKey', () => {
    const merged = mergeDslWithOverrides(base, {
      sections: [{ sectionTypeKey: 'education_v1', order: 1, visible: false }],
    });

    const education = merged.sections.find((s) => s.sectionTypeKey === 'education_v1');
    expect(education?.visible).toBe(false);
  });

  it('should keep base sections not present in overrides', () => {
    const merged = mergeDslWithOverrides(base, {
      sections: [{ sectionTypeKey: 'education_v1', order: 1, visible: false }],
    });

    expect(merged.sections).toHaveLength(3);
    expect(merged.sections.find((s) => s.sectionTypeKey === 'work_experience_v1')?.visible).toBe(
      true,
    );
  });

  it('should append override sections not present in base', () => {
    const merged = mergeDslWithOverrides(base, {
      sections: [{ sectionTypeKey: 'projects_v1', order: 3, visible: true }],
    });

    expect(merged.sections).toHaveLength(4);
    expect(merged.sections.find((s) => s.sectionTypeKey === 'projects_v1')).toBeDefined();
  });

  it('should merge headerOverrides', () => {
    const baseWithHeader: ResumeDslV2 = {
      ...base,
      headerOverrides: { jobTitle: 'Engineer' },
    };

    const merged = mergeDslWithOverrides(baseWithHeader, {
      headerOverrides: { jobTitle: 'Senior Engineer' },
    });

    expect(merged.headerOverrides?.jobTitle).toBe('Senior Engineer');
  });

  it('should set headerOverrides when base has none', () => {
    const merged = mergeDslWithOverrides(base, {
      headerOverrides: { jobTitle: 'CTO' },
    });

    expect(merged.headerOverrides?.jobTitle).toBe('CTO');
  });

  it('should preserve base headerOverrides when no override is given', () => {
    const baseWithHeader: ResumeDslV2 = {
      ...base,
      headerOverrides: { jobTitle: 'Engineer' },
    };

    const merged = mergeDslWithOverrides(baseWithHeader, {});

    expect(merged.headerOverrides?.jobTitle).toBe('Engineer');
  });
});
