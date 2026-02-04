/**
 * Deep Merge Utility for Style Configs
 * Merges user customizations over base theme config
 */

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function deepMerge<T extends object>(
  base: T,
  overrides: DeepPartial<T>,
): T {
  const result = { ...base };

  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const baseVal = base[key];
    const overrideVal = overrides[key];

    if (overrideVal === undefined) continue;

    if (
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal) &&
      typeof overrideVal === 'object' &&
      overrideVal !== null &&
      !Array.isArray(overrideVal)
    ) {
      result[key] = deepMerge(
        baseVal as object,
        overrideVal as object,
      ) as T[keyof T];
    } else {
      result[key] = overrideVal as T[keyof T];
    }
  }

  return result;
}
