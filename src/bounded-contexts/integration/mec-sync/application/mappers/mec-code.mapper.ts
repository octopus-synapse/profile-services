/**
 * MEC Code Mappers — pure functions translating MEC's numeric codes
 * (organização, categoria, grau, modalidade, situação) into the human-
 * readable Portuguese labels we persist.
 *
 * Unknown codes fall through to the raw value (so we don't drop data
 * if MEC adds a new code) and finally to `null` if the code is empty.
 */

const ORGANIZATION_MAP: Record<string, string> = {
  '1': 'Universidade',
  '2': 'Centro Universitário',
  '3': 'Faculdade',
  '4': 'Instituto Federal',
  '5': 'Centro Federal',
};

const CATEGORY_MAP: Record<string, string> = {
  '1': 'Pública Federal',
  '2': 'Pública Estadual',
  '3': 'Pública Municipal',
  '4': 'Privada com fins lucrativos',
  '5': 'Privada sem fins lucrativos',
  '6': 'Especial',
};

const DEGREE_MAP: Record<string, string> = {
  '1': 'Bacharelado',
  '2': 'Licenciatura',
  '3': 'Tecnológico',
  '4': 'Bacharelado e Licenciatura',
};

const MODALITY_MAP: Record<string, string> = { '1': 'Presencial', '2': 'EaD' };

const STATUS_MAP: Record<string, string> = {
  '1': 'Em atividade',
  '2': 'Extinto',
  '3': 'Em extinção',
};

export function mapOrganization(code: string): string | null {
  return ORGANIZATION_MAP[code] || code || null;
}

export function mapCategory(code: string): string | null {
  return CATEGORY_MAP[code] || code || null;
}

export function mapDegree(code: string): string | null {
  return DEGREE_MAP[code] || code || null;
}

export function mapModality(code: string): string | null {
  return MODALITY_MAP[code] || code || null;
}

export function mapCourseStatus(code: string): string | null {
  return STATUS_MAP[code] || code || null;
}
