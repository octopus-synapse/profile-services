export type OrderByConfig =
  | { type: 'user-defined' }
  | { type: 'date-desc'; field: string }
  | {
      type: 'multiple';
      fields: Array<{ field: string; direction: 'asc' | 'desc' }>;
    };

export type FindAllFilters = Record<string, unknown>;

export function buildOrderByClause(
  config: OrderByConfig,
): Record<string, string> | Array<Record<string, string>> {
  switch (config.type) {
    case 'user-defined':
      return { order: 'asc' };
    case 'date-desc':
      return { [config.field]: 'desc' };
    case 'multiple':
      return config.fields.map((f) => ({ [f.field]: f.direction }));
  }
}
