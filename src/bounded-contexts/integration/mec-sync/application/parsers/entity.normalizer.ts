/**
 * Entity Normalizer — turns a raw `MecCsvRow` into the persisted
 * `NormalizedInstitution` / `NormalizedCourse` shapes. Returns `null`
 * for rows missing the required keys (CO_IES + name, or CO_CURSO +
 * CO_IES + name) so the caller can skip them.
 */

import type {
  MecCsvRow,
  NormalizedCourse,
  NormalizedInstitution,
} from '../../domain/entities/mec-row';
import {
  mapCategory,
  mapCourseStatus,
  mapDegree,
  mapModality,
  mapOrganization,
} from '../mappers/mec-code.mapper';
import { normalizeText } from '../mappers/text.normalizer';

export function normalizeInstitution(row: MecCsvRow): NormalizedInstitution | null {
  const codigoIes = parseInt(row.CO_IES, 10);

  if (Number.isNaN(codigoIes) || !row.NO_IES || !row.SG_UF_IES) {
    return null;
  }

  return {
    codigoIes,
    nome: normalizeText(row.NO_IES),
    sigla: normalizeText(row.SG_IES) || null,
    organizacao: mapOrganization(row.TP_ORGANIZACAO),
    categoria: mapCategory(row.TP_CATEGORIA),
    uf: row.SG_UF_IES.toUpperCase(),
    municipio: normalizeText(row.NO_MUNICIPIO_IES) || null,
    codigoMunicipio: parseInt(row.CO_MUNICIPIO_IES, 10) || null,
  };
}

export function normalizeCourse(row: MecCsvRow): NormalizedCourse | null {
  const codigoCurso = parseInt(row.CO_CURSO, 10);
  const codigoIes = parseInt(row.CO_IES, 10);

  if (Number.isNaN(codigoCurso) || Number.isNaN(codigoIes) || !row.NO_CURSO) {
    return null;
  }

  return {
    codigoCurso,
    codigoIes,
    nome: normalizeText(row.NO_CURSO),
    grau: mapDegree(row.TP_GRAU),
    modalidade: mapModality(row.TP_MODALIDADE),
    areaConhecimento: normalizeText(row.NO_CINE_AREA_GERAL) || null,
    cargaHoraria: parseInt(row.QT_CARGA_HORARIA, 10) || null,
    situacao: mapCourseStatus(row.CO_SITUACAO),
  };
}
