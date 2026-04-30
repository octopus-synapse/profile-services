/**
 * MEC row shapes — pure POJO domain entities used through the parsing
 * and sync pipeline.
 *
 * `MecCsvRow` mirrors the raw column-name space of the MEC CSV (with
 * fallbacks tolerated by `mapToMecRow`). `NormalizedInstitution` and
 * `NormalizedCourse` are the persisted shapes after normalization.
 * `SyncResult` / `SyncError` / `SyncMetadata` describe the orchestrator
 * output and the metadata snapshot kept in cache.
 */

export interface MecCsvRow {
  CO_IES: string;
  NO_IES: string;
  SG_IES: string;
  TP_ORGANIZACAO: string;
  TP_CATEGORIA: string;
  CO_MUNICIPIO_IES: string;
  NO_MUNICIPIO_IES: string;
  SG_UF_IES: string;
  CO_CURSO: string;
  NO_CURSO: string;
  TP_GRAU: string;
  TP_MODALIDADE: string;
  NO_CINE_AREA_GERAL: string;
  QT_CARGA_HORARIA: string;
  CO_SITUACAO: string;
  [key: string]: string;
}

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

export interface SyncMetadata {
  lastSyncAt: string;
  lastSyncStatus: 'success' | 'failed' | 'partial';
  lastSyncDuration: number;
  totalInstitutions: number;
  totalCourses: number;
  triggeredBy: string;
}

export const MEC_CACHE_KEYS = {
  SYNC_LOCK: 'mec:sync:lock',
  SYNC_METADATA: 'mec:sync:metadata',
  INSTITUTIONS_LIST: 'mec:institutions:list',
  INSTITUTIONS_BY_UF: 'mec:institutions:uf:',
  COURSES_BY_IES: 'mec:courses:ies:',
  COURSES_SEARCH: 'mec:courses:search:',
} as const;

export const MEC_CACHE_TTL = {
  SYNC_LOCK: 600,
  METADATA: 86400,
  INSTITUTIONS_LIST: 3600,
  INSTITUTIONS_BY_UF: 3600,
  COURSES_BY_IES: 1800,
  COURSES_SEARCH: 300,
} as const;
