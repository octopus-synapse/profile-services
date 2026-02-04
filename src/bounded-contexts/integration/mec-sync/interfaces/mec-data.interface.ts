/**
 * MEC Data Interfaces
 * Represents raw CSV data and normalized entities
 */

// Raw CSV row from MEC dataset
export interface MecCsvRow {
  CO_IES: string; // Código da IES
  NO_IES: string; // Nome da IES
  SG_IES: string; // Sigla da IES
  TP_ORGANIZACAO: string; // Tipo de organização acadêmica
  TP_CATEGORIA: string; // Categoria administrativa
  CO_MUNICIPIO_IES: string; // Código IBGE do município
  NO_MUNICIPIO_IES: string; // Nome do município
  SG_UF_IES: string; // UF da IES
  CO_CURSO: string; // Código do curso
  NO_CURSO: string; // Nome do curso
  TP_GRAU: string; // Grau acadêmico
  TP_MODALIDADE: string; // Modalidade de ensino
  NO_CINE_AREA_GERAL: string; // Área de conhecimento
  QT_CARGA_HORARIA: string; // Carga horária
  CO_SITUACAO: string; // Situação do curso
  [key: string]: string; // Allow additional fields
}

// Normalized institution data
export interface NormalizedInstitution {
  codigoIes: number;
  nome: string;
  sigla: string | null;
  organizacao: string | null;
  categoria: string | null;
  uf: string;
  municipio: string | null;
  codigoMunicipio: number | null;
}

// Normalized course data
export interface NormalizedCourse {
  codigoCurso: number;
  codigoIes: number;
  nome: string;
  grau: string | null;
  modalidade: string | null;
  areaConhecimento: string | null;
  cargaHoraria: number | null;
  situacao: string | null;
}

// Sync result metrics
export interface SyncResult {
  institutionsInserted: number;
  institutionsUpdated: number;
  coursesInserted: number;
  coursesUpdated: number;
  totalRowsProcessed: number;
  errors: SyncError[];
}

export interface SyncError {
  row: number;
  field?: string;
  message: string;
  data?: unknown;
}

// Sync metadata stored in Redis
export interface SyncMetadata {
  lastSyncAt: string;
  lastSyncStatus: 'success' | 'failed' | 'partial';
  lastSyncDuration: number; // milliseconds
  totalInstitutions: number;
  totalCourses: number;
  triggeredBy: string;
}

// Cache keys constants
export const MEC_CACHE_KEYS = {
  SYNC_LOCK: 'mec:sync:lock',
  SYNC_METADATA: 'mec:sync:metadata',
  INSTITUTIONS_LIST: 'mec:institutions:list',
  INSTITUTIONS_BY_UF: 'mec:institutions:uf:', // + uf code
  COURSES_BY_IES: 'mec:courses:ies:', // + ies code
  COURSES_SEARCH: 'mec:courses:search:', // + search term hash
} as const;

// TTL constants (in seconds)
export const MEC_CACHE_TTL = {
  SYNC_LOCK: 600, // 10 minutes (max sync duration)
  METADATA: 86400, // 24 hours
  INSTITUTIONS_LIST: 3600, // 1 hour
  INSTITUTIONS_BY_UF: 3600, // 1 hour
  COURSES_BY_IES: 1800, // 30 minutes
  COURSES_SEARCH: 300, // 5 minutes
} as const;
