import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { CsvRowProcessorService } from './csv-row-processor.service';

const HEADER_LINE =
  'CO_IES,NO_IES,SG_IES,TP_ORGANIZACAO,TP_CATEGORIA,CO_MUNICIPIO_IES,NO_MUNICIPIO_IES,SG_UF_IES,CO_CURSO,NO_CURSO,TP_GRAU,TP_MODALIDADE,NO_CINE_AREA_GERAL,QT_CARGA_HORARIA,CO_SITUACAO';

const VALID_ROW =
  '1,Universidade Federal,UFRJ,1,1,3304557,Rio de Janeiro,RJ,116815,Computação,1,1,Computação,3200,1';

describe('CsvRowProcessorService', () => {
  it('parses institutions and courses, deduplicating by codigoIes', () => {
    const service = new CsvRowProcessorService(stubLogger);

    const columnMap = new Map<string, number>(
      HEADER_LINE.split(',').map((col, i) => [col, i] as [string, number]),
    );

    const result = service.processDataRows([HEADER_LINE, VALID_ROW, VALID_ROW], columnMap);

    expect(result.institutions.size).toBe(1);
    expect(result.courses).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });
});
