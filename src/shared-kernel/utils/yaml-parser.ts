/**
 * Minimal YAML parser for GitHub Linguist-style files.
 * Handles: maps, arrays (- items), strings, booleans, numbers, null.
 * Does NOT handle: anchors, tags, multi-line strings, flow style.
 */

type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue };

export function parse(input: string): Record<string, YamlValue> {
  const lines = input.split('\n');
  const result: Record<string, YamlValue> = {};
  const stack: { indent: number; obj: Record<string, YamlValue> }[] = [{ indent: -1, obj: result }];
  let _currentKey = '';
  let currentArray: YamlValue[] | null = null;
  let arrayIndent = -1;

  for (const raw of lines) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue;

    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();

    if (currentArray !== null && indent <= arrayIndent) {
      currentArray = null;
      arrayIndent = -1;
    }

    if (line.startsWith('- ')) {
      if (currentArray) {
        currentArray.push(parseScalar(line.slice(2).trim()));
      }
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const valueRaw = line.slice(colonIdx + 1).trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (valueRaw === '' || valueRaw === '~') {
      const child: Record<string, YamlValue> = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
      _currentKey = key;
      currentArray = null;
    } else {
      const parsed = parseScalar(valueRaw);
      if (parsed === '[]') {
        const arr: YamlValue[] = [];
        parent[key] = arr;
        currentArray = arr;
        arrayIndent = indent;
      } else {
        parent[key] = parsed;
        currentArray = null;
      }
      _currentKey = key;
    }
  }

  return result;
}

function parseScalar(value: string): YamlValue {
  if (value === '[]') return '[]';
  if (value === 'true' || value === 'True' || value === 'TRUE') return true;
  if (value === 'false' || value === 'False' || value === 'FALSE') return false;
  if (value === 'null' || value === '~') return null;

  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1);
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((s) => parseScalar(s.trim()));
  }

  const num = Number(value);
  if (!Number.isNaN(num) && value !== '') return num;

  return value;
}
