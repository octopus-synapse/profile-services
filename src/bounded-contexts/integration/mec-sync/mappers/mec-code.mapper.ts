/**
 * MEC Code Mappers
 * Single Responsibility: Map MEC numeric codes to human-readable labels
 *
 * These mappings come from MEC's official documentation.
 * Each code represents a specific category in the Brazilian education system.
 */

/**
 * Organization Type (Organização Acadêmica)
 */
const ORGANIZATION_MAP: Record<string, string> = {
  '1': 'Universidade',
  '2': 'Centro Universitário',
  '3': 'Faculdade',
  '4': 'Instituto Federal',
  '5': 'Centro Federal',
};

/**
 * Administrative Category (Categoria Administrativa)
 */
const CATEGORY_MAP: Record<string, string> = {
  '1': 'Pública Federal',
  '2': 'Pública Estadual',
  '3': 'Pública Municipal',
  '4': 'Privada com fins lucrativos',
  '5': 'Privada sem fins lucrativos',
  '6': 'Especial',
};

/**
 * Academic Degree (Grau Acadêmico)
 */
const DEGREE_MAP: Record<string, string> = {
  '1': 'Bacharelado',
  '2': 'Licenciatura',
  '3': 'Tecnológico',
  '4': 'Bacharelado e Licenciatura',
};

/**
 * Teaching Modality (Modalidade de Ensino)
 */
const MODALITY_MAP: Record<string, string> = {
  '1': 'Presencial',
  '2': 'EaD',
};

/**
 * Course Status (Situação do Curso)
 */
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
