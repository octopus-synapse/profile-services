// `base` is generic so callers can pass a typed DSL object (interfaces
// without index signatures are not assignable to Record<string, unknown>)
// without casting through `unknown`; the merge result keeps that type.
export function mergeDsl<T extends object>(base: T, overrides: Record<string, unknown>): T {
  const result = { ...(base as Record<string, unknown>) };

  for (const key of Object.keys(overrides)) {
    const baseValue = (base as Record<string, unknown>)[key];
    const overrideValue = overrides[key];

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = mergeDsl(baseValue, overrideValue);
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue;
    }
  }

  return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
