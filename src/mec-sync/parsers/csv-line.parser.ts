/**
 * CSV Line Parser
 * Single Responsibility: Parse individual CSV lines handling quoted fields
 */

/**
 * Parse a single CSV line handling quoted fields
 * MEC CSV uses comma as delimiter
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Build a map of column names to indices
 */
export function buildColumnMap(header: string[]): Map<string, number> {
  const map = new Map<string, number>();

  header.forEach((col, index) => {
    const normalized = col
      .replace(/^\uFEFF/, '') // Remove BOM
      .trim()
      .toUpperCase();
    map.set(normalized, index);
  });

  return map;
}

/**
 * Get value from column map with fallback keys
 */
export function getColumnValue(
  values: string[],
  columnMap: Map<string, number>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const index = columnMap.get(key);
    if (index !== undefined && values[index]) {
      return values[index];
    }
  }
  return '';
}
