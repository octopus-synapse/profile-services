export function searchWhere(
  term: string,
  fields: string[],
): Array<Record<string, { contains: string; mode: 'insensitive' }>> {
  return fields.map((field) => ({
    [field]: { contains: term, mode: 'insensitive' as const },
  }));
}
