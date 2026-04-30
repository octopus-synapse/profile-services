/**
 * MEC Row Mapper — array values + column-name index → `MecCsvRow`.
 *
 * The MEC dataset uses different column names across vintages
 * (CO_IES vs CODIGO_IES, MODALIDADE vs TP_MODALIDADE_ENSINO, …); this
 * mapper centralizes the alias chains so the rest of the pipeline can
 * read a stable, canonical row shape.
 */

import type { MecCsvRow } from '../../domain/entities/mec-row';
import { getColumnValue } from './csv-line.parser';

export function mapToMecRow(values: string[], columnMap: Map<string, number>): MecCsvRow {
  return {
    CO_IES: getColumnValue(values, columnMap, 'CODIGO_IES', 'CO_IES'),
    NO_IES: getColumnValue(values, columnMap, 'NOME_IES', 'NO_IES'),
    SG_IES: getColumnValue(values, columnMap, 'SG_IES'),
    TP_ORGANIZACAO: getColumnValue(
      values,
      columnMap,
      'ORGANIZACAO_ACADEMICA',
      'TP_ORGANIZACAO_ACADEMICA',
      'TP_ORGANIZACAO',
    ),
    TP_CATEGORIA: getColumnValue(
      values,
      columnMap,
      'CATEGORIA_ADMINISTRATIVA',
      'TP_CATEGORIA_ADMINISTRATIVA',
      'TP_CATEGORIA',
    ),
    CO_MUNICIPIO_IES: getColumnValue(
      values,
      columnMap,
      'CODIGO_MUNICIPIO',
      'CO_MUNICIPIO_IES',
      'CO_MUNICIPIO',
    ),
    NO_MUNICIPIO_IES: getColumnValue(
      values,
      columnMap,
      'MUNICIPIO',
      'NO_MUNICIPIO_IES',
      'NO_MUNICIPIO',
    ),
    SG_UF_IES: getColumnValue(values, columnMap, 'UF', 'SG_UF_IES', 'SG_UF'),
    CO_CURSO: getColumnValue(values, columnMap, 'CODIGO_CURSO', 'CO_CURSO'),
    NO_CURSO: getColumnValue(values, columnMap, 'NOME_CURSO', 'NO_CURSO'),
    TP_GRAU: getColumnValue(values, columnMap, 'GRAU', 'TP_GRAU_ACADEMICO', 'TP_GRAU'),
    TP_MODALIDADE: getColumnValue(
      values,
      columnMap,
      'MODALIDADE',
      'TP_MODALIDADE_ENSINO',
      'TP_MODALIDADE',
    ),
    NO_CINE_AREA_GERAL: getColumnValue(
      values,
      columnMap,
      'AREA_OCDE_CINE',
      'AREA_OCDE',
      'NO_CINE_AREA_GERAL',
      'NO_AREA',
    ),
    QT_CARGA_HORARIA: getColumnValue(
      values,
      columnMap,
      'CARGA_HORARIA',
      'QT_CARGA_HORARIA_TOTAL',
      'QT_CARGA_HORARIA',
    ),
    CO_SITUACAO: getColumnValue(
      values,
      columnMap,
      'SITUACAO_CURSO',
      'CO_SITUACAO_CURSO',
      'CO_SITUACAO',
    ),
  };
}
