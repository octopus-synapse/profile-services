import type { Locale } from '@packages/i18n';
import type {
  FieldDefinition,
  FieldTranslation,
  FieldTranslationsJson,
} from './locale-resolver.types';

/** Resolve field translation with fallback chain. */
function resolveFieldTranslation(
  translations: FieldTranslationsJson | undefined,
  locale: Locale,
): FieldTranslation {
  if (!translations) return {};
  if (translations[locale]) return translations[locale];
  if (translations.en) return translations.en;
  const firstKey = Object.keys(translations)[0];
  if (firstKey && translations[firstKey]) return translations[firstKey];
  return {};
}

/** Resolve a single field's meta for locale; returns new meta object. */
function resolveFieldMeta(meta: FieldDefinition['meta'], locale: Locale): Record<string, unknown> {
  if (!meta) return {};
  const { translations, label, placeholder, helpText, ...rest } = meta;
  const resolved = resolveFieldTranslation(
    translations as FieldTranslationsJson | undefined,
    locale,
  );
  return {
    ...rest,
    label: resolved.label || label,
    placeholder: resolved.placeholder || placeholder,
    helpText: resolved.helpText || helpText,
  };
}

/**
 * Recursively resolve field definitions for locale. Flattens
 * meta.label/placeholder/helpText to field root level for frontend.
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

    return {
      ...field,
      label: label || field.key || '',
      placeholder: placeholder || '',
      helpText: helpText || '',
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
                // biome-ignore lint/style/noNonNullAssertion: items is verified to exist by parent ternary
                label: itemLabel || field.items!.key || '',
                placeholder: itemPlaceholder || '',
                helpText: itemHelpText || '',
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
