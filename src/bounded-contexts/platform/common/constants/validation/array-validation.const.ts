/**
 * Array Validation Constants
 *
 * Maximum limits for array fields to prevent abuse.
 */
export const ARRAY_LIMIT = {
  MAX: {
    TAG_VALUES_PER_GROUP: 20,
    TAG_GROUPS: 10,
    SECTION_ITEMS: 15,
    SECTION_GROUPS: 10,
    SHOWCASE_ITEMS: 20,
    AUXILIARY_ITEMS: 20,
    LOCALE_ITEMS: 10,
    HONOR_ITEMS: 10,
    REFERENCE_ITEMS: 10,
  },
} as const;
