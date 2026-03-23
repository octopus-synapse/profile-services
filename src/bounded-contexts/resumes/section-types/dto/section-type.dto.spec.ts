import { describe, expect, it } from 'bun:test';
import { CreateSectionTypeSchema, UpdateSectionTypeSchema } from './section-type.dto';

const validTranslations = {
  en: { title: 'Work Experience', label: 'work' },
  'pt-BR': { title: 'Experiência Profissional', label: 'trabalho' },
  es: { title: 'Experiencia Laboral', label: 'trabajo' },
};

const validCreateInput = {
  key: 'work_experience_v1',
  slug: 'work-experience',
  title: 'Work Experience',
  semanticKind: 'WORK_EXPERIENCE',
  definition: { fields: [] },
  translations: validTranslations,
};

describe('CreateSectionTypeSchema', () => {
  it('should reject when translations is missing', () => {
    const { translations: _, ...input } = validCreateInput;
    const result = CreateSectionTypeSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject empty translations object', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      translations: {},
    });

    expect(result.success).toBe(false);
  });

  it('should reject when only "en" locale is provided', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      translations: { en: { title: 'Work', label: 'work' } },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join(', ');
      expect(msg).toContain('all supported locales');
    }
  });

  it('should reject when a locale has empty title', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      translations: {
        en: { title: '', label: 'work' },
        'pt-BR': { title: 'Experiência', label: 'trabalho' },
        es: { title: 'Experiencia', label: 'trabajo' },
      },
    });

    expect(result.success).toBe(false);
  });

  it('should reject when a locale has empty label', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      translations: {
        en: { title: 'Work', label: '' },
        'pt-BR': { title: 'Experiência', label: 'trabalho' },
        es: { title: 'Experiencia', label: 'trabajo' },
      },
    });

    expect(result.success).toBe(false);
  });

  it('should reject when a locale is missing label', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      translations: {
        en: { title: 'Work' },
        'pt-BR': { title: 'Experiência', label: 'trabalho' },
        es: { title: 'Experiencia', label: 'trabajo' },
      },
    });

    expect(result.success).toBe(false);
  });

  it('should pass with all 3 locales having title and label', () => {
    const result = CreateSectionTypeSchema.safeParse(validCreateInput);

    expect(result.success).toBe(true);
  });

  it('should pass with optional fields included', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      translations: {
        en: {
          title: 'Work',
          label: 'work',
          description: 'Your jobs',
          noDataLabel: 'No experience yet',
          placeholder: 'Add your experience',
          addLabel: 'Add experience',
        },
        'pt-BR': { title: 'Experiência', label: 'trabalho' },
        es: { title: 'Experiencia', label: 'trabajo' },
      },
    });

    expect(result.success).toBe(true);
  });
});

describe('UpdateSectionTypeSchema', () => {
  it('should pass without translations (partial update)', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      title: 'Updated Title',
    });

    expect(result.success).toBe(true);
  });

  it('should pass with a single locale having title and label', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      translations: {
        en: { title: 'Updated Work', label: 'updated-work' },
      },
    });

    expect(result.success).toBe(true);
  });

  it('should reject when provided locale has empty title', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      translations: {
        en: { title: '', label: 'work' },
      },
    });

    expect(result.success).toBe(false);
  });

  it('should reject when provided locale is missing title', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      translations: {
        en: { label: 'work' },
      },
    });

    expect(result.success).toBe(false);
  });

  it('should reject when provided locale is missing label', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      translations: {
        en: { title: 'Work' },
      },
    });

    expect(result.success).toBe(false);
  });

  it('should pass with multiple locales each having title and label', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      translations: {
        en: { title: 'Work', label: 'work' },
        es: { title: 'Experiencia', label: 'trabajo' },
      },
    });

    expect(result.success).toBe(true);
  });
});

describe('CreateSectionTypeSchema — icon format validation', () => {
  it('should pass with valid emoji icon', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      iconType: 'emoji',
      icon: '💼',
    });

    expect(result.success).toBe(true);
  });

  it('should pass with valid lucide icon name', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      iconType: 'lucide',
      icon: 'briefcase',
    });

    expect(result.success).toBe(true);
  });

  it('should pass with multi-segment lucide icon name', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      iconType: 'lucide',
      icon: 'graduation-cap',
    });

    expect(result.success).toBe(true);
  });

  it('should reject non-kebab-case string when iconType is lucide', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      iconType: 'lucide',
      icon: 'Briefcase',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('icon'))).toBe(true);
    }
  });

  it('should reject emoji when iconType is lucide', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      iconType: 'lucide',
      icon: '💼',
    });

    expect(result.success).toBe(false);
  });

  it('should reject plain text when iconType is emoji', () => {
    const result = CreateSectionTypeSchema.safeParse({
      ...validCreateInput,
      iconType: 'emoji',
      icon: 'briefcase',
    });

    expect(result.success).toBe(false);
  });

  it('should use default emoji icon when icon is omitted', () => {
    const result = CreateSectionTypeSchema.safeParse(validCreateInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.icon).toBe('📄');
      expect(result.data.iconType).toBe('emoji');
    }
  });
});

describe('UpdateSectionTypeSchema — icon format validation', () => {
  it('should pass when both iconType and icon are valid lucide', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      iconType: 'lucide',
      icon: 'book-open',
    });

    expect(result.success).toBe(true);
  });

  it('should reject mismatched iconType lucide with emoji icon', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      iconType: 'lucide',
      icon: '🎓',
    });

    expect(result.success).toBe(false);
  });

  it('should skip cross-field validation when only icon is provided', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      icon: 'anything-goes',
    });

    expect(result.success).toBe(true);
  });

  it('should skip cross-field validation when only iconType is provided', () => {
    const result = UpdateSectionTypeSchema.safeParse({
      iconType: 'lucide',
    });

    expect(result.success).toBe(true);
  });
});
