import { ENUM_DICTIONARY, type Locale } from '@packages/i18n';
import type {
  FieldDefinition,
  FieldTranslation,
  FieldTranslationsJson,
} from './locale-resolver.types';

type EnumLabels = Record<string, Record<string, Record<Locale, string>>>;

/**
 * Translate an enum field's SCREAMING_CASE values into {value,label} pairs via
 * the shared ENUM_DICTIONARY, so the editor pills render localized labels in
 * BOTH the onboarding and profile flows from one source. The raw `enum` is
 * kept untouched for Zod validation. Throws on a value missing from the
 * dictionary — a drift the i18n enum parity spec catches first.
 */
function resolveEnumOptions(
  enumName: unknown,
  values: string[] | undefined,
  locale: Locale,
): Array<{ value: string; label: string }> | undefined {
  if (typeof enumName !== 'string' || !Array.isArray(values)) return undefined;
  const dict = (ENUM_DICTIONARY as EnumLabels)[enumName];
  if (!dict) {
    throw new MissingFieldTranslationError(
      locale,
      `enum '${enumName}' has no ENUM_DICTIONARY entry`,
    );
  }
  return values.map((value) => {
    const label = dict[value]?.[locale];
    if (!label) {
      throw new MissingFieldTranslationError(
        locale,
        `enum '${enumName}' is missing value '${value}'`,
      );
    }
    return { value, label };
  });
}

/**
 * i18n is mandatory — there is NO fallback chain. A visible field that reaches
 * here without a translation for the requested locale is a BUG (drift between
 * the catalog and prisma/seeds/shared/field-translations.ts), so we throw instead of
 * silently rendering the raw English `meta.label`. The seed-time validation
 * (`injectFieldTranslations`) and the parity specs in test/static-analysis/i18n
 * are the first lines of defence; this throw is the last.
 */
class MissingFieldTranslationError extends Error {
  constructor(locale: Locale, detail: string) {
    super(`[i18n] Missing field translation for locale '${locale}': ${detail}. No fallback.`);
    this.name = 'MissingFieldTranslationError';
  }
}

/** Resolve a field's translation for a locale — throws when absent. */
function resolveFieldTranslation(
  translations: FieldTranslationsJson | undefined,
  locale: Locale,
  fieldHint: string,
): FieldTranslation {
  if (!translations) {
    throw new MissingFieldTranslationError(locale, `field '${fieldHint}' has no translations`);
  }
  const entry = translations[locale];
  if (!entry) {
    throw new MissingFieldTranslationError(
      locale,
      `field '${fieldHint}' has no entry for this locale`,
    );
  }
  return entry;
}

/**
 * Resolve a single field's meta for a locale; returns a new meta object.
 * - No meta at all (e.g. a scalar array item like `{ type: 'string' }`) → {}.
 * - Hidden fields are never displayed, so they keep their raw meta untouched.
 * - Visible fields MUST carry a complete translation (label required); missing
 *   data throws rather than falling back to the English `meta.label`.
 */
function resolveFieldMeta(meta: FieldDefinition['meta'], locale: Locale): Record<string, unknown> {
  if (!meta) return {};
  const { translations, label, placeholder, helpText, ...rest } = meta;

  if ((rest as { hidden?: boolean }).hidden === true) {
    return { ...rest, label, placeholder, helpText };
  }

  const fieldHint = typeof label === 'string' && label ? label : '(unnamed field)';
  const resolved = resolveFieldTranslation(
    translations as FieldTranslationsJson | undefined,
    locale,
    fieldHint,
  );
  if (!resolved.label) {
    throw new MissingFieldTranslationError(locale, `field '${fieldHint}' has an empty label`);
  }

  return {
    ...rest,
    label: resolved.label,
    placeholder: resolved.placeholder,
    helpText: resolved.helpText,
  };
}

/**
 * Recursively resolve field definitions for a locale. Flattens
 * meta.label/placeholder/helpText to the field root for the frontend.
 */
export function resolveFieldsForLocale(
  fields: FieldDefinition[] | undefined,
  locale: Locale,
): FieldDefinition[] | undefined {
  if (!fields || !Array.isArray(fields)) return fields;

  return fields.map((field) => {
    const resolvedMeta = resolveFieldMeta(field.meta, locale);
    const { label, placeholder, helpText, ...restMeta } = resolvedMeta as {
      label?: string;
      placeholder?: string;
      helpText?: string;
      [key: string]: unknown;
    };

    const options = resolveEnumOptions(restMeta.enumName, field.enum, locale);

    return {
      ...field,
      // Scalar items / structural fields legitimately have no label, hence ?? ''.
      // Visible fields always have one (resolveFieldMeta throws otherwise).
      label: label ?? '',
      placeholder: placeholder ?? '',
      helpText: helpText ?? '',
      ...(options ? { options } : {}),
      meta: Object.keys(restMeta).length > 0 ? restMeta : undefined,
      fields: field.fields ? resolveFieldsForLocale(field.fields, locale) : undefined,
      items: field.items
        ? {
            ...field.items,
            ...(() => {
              // biome-ignore lint/style/noNonNullAssertion: items is verified to exist by parent ternary
              const itemMeta = resolveFieldMeta(field.items!.meta, locale);
              const {
                label: itemLabel,
                placeholder: itemPlaceholder,
                helpText: itemHelpText,
                ...itemRestMeta
              } = itemMeta as {
                label?: string;
                placeholder?: string;
                helpText?: string;
                [key: string]: unknown;
              };
              return {
                label: itemLabel ?? '',
                placeholder: itemPlaceholder ?? '',
                helpText: itemHelpText ?? '',
                meta: Object.keys(itemRestMeta).length > 0 ? itemRestMeta : undefined,
              };
            })(),
            fields: field.items.fields
              ? resolveFieldsForLocale(field.items.fields, locale)
              : undefined,
          }
        : undefined,
    };
  });
}
