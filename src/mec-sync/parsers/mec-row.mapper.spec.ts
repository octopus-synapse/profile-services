import { mapToMecRow } from './mec-row.mapper';

describe('MEC Row Mapper', () => {
  describe('mapToMecRow', () => {
    describe('Standard Column Names', () => {
      it('should map values with standard MEC column names', () => {
        const columnMap = new Map([
          ['CO_IES', 0],
          ['NO_IES', 1],
          ['SG_IES', 2],
          ['TP_ORGANIZACAO', 3],
          ['TP_CATEGORIA', 4],
          ['CO_MUNICIPIO_IES', 5],
          ['NO_MUNICIPIO_IES', 6],
          ['SG_UF_IES', 7],
          ['CO_CURSO', 8],
          ['NO_CURSO', 9],
          ['TP_GRAU', 10],
          ['TP_MODALIDADE', 11],
          ['NO_CINE_AREA_GERAL', 12],
          ['QT_CARGA_HORARIA', 13],
          ['CO_SITUACAO', 14],
        ]);

        const values = [
          '12345', // CO_IES
          'Universidade Federal do Rio de Janeiro', // NO_IES
          'UFRJ', // SG_IES
          'Universidade', // TP_ORGANIZACAO
          'Pública Federal', // TP_CATEGORIA
          '3304557', // CO_MUNICIPIO_IES
          'Rio de Janeiro', // NO_MUNICIPIO_IES
          'RJ', // SG_UF_IES
          '1001', // CO_CURSO
          'Ciência da Computação', // NO_CURSO
          'Bacharelado', // TP_GRAU
          'Presencial', // TP_MODALIDADE
          'Computação', // NO_CINE_AREA_GERAL
          '3200', // QT_CARGA_HORARIA
          'Em atividade', // CO_SITUACAO
        ];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_IES).toBe('12345');
        expect(result.NO_IES).toBe('Universidade Federal do Rio de Janeiro');
        expect(result.SG_IES).toBe('UFRJ');
        expect(result.TP_ORGANIZACAO).toBe('Universidade');
        expect(result.TP_CATEGORIA).toBe('Pública Federal');
        expect(result.CO_MUNICIPIO_IES).toBe('3304557');
        expect(result.NO_MUNICIPIO_IES).toBe('Rio de Janeiro');
        expect(result.SG_UF_IES).toBe('RJ');
        expect(result.CO_CURSO).toBe('1001');
        expect(result.NO_CURSO).toBe('Ciência da Computação');
        expect(result.TP_GRAU).toBe('Bacharelado');
        expect(result.TP_MODALIDADE).toBe('Presencial');
        expect(result.NO_CINE_AREA_GERAL).toBe('Computação');
        expect(result.QT_CARGA_HORARIA).toBe('3200');
        expect(result.CO_SITUACAO).toBe('Em atividade');
      });
    });

    describe('Alternative Column Names', () => {
      it('should handle CODIGO_IES as alternative to CO_IES', () => {
        const columnMap = new Map([['CODIGO_IES', 0]]);
        const values = ['12345'];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_IES).toBe('12345');
      });

      it('should handle NOME_IES as alternative to NO_IES', () => {
        const columnMap = new Map([['NOME_IES', 0]]);
        const values = ['Universidade Test'];

        const result = mapToMecRow(values, columnMap);

        expect(result.NO_IES).toBe('Universidade Test');
      });

      it('should handle ORGANIZACAO_ACADEMICA as alternative', () => {
        const columnMap = new Map([['ORGANIZACAO_ACADEMICA', 0]]);
        const values = ['Universidade'];

        const result = mapToMecRow(values, columnMap);

        expect(result.TP_ORGANIZACAO).toBe('Universidade');
      });

      it('should handle TP_ORGANIZACAO_ACADEMICA as alternative', () => {
        const columnMap = new Map([['TP_ORGANIZACAO_ACADEMICA', 0]]);
        const values = ['Centro Universitário'];

        const result = mapToMecRow(values, columnMap);

        expect(result.TP_ORGANIZACAO).toBe('Centro Universitário');
      });

      it('should handle CATEGORIA_ADMINISTRATIVA as alternative', () => {
        const columnMap = new Map([['CATEGORIA_ADMINISTRATIVA', 0]]);
        const values = ['Privada'];

        const result = mapToMecRow(values, columnMap);

        expect(result.TP_CATEGORIA).toBe('Privada');
      });

      it('should handle CODIGO_MUNICIPIO as alternative', () => {
        const columnMap = new Map([['CODIGO_MUNICIPIO', 0]]);
        const values = ['1234567'];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_MUNICIPIO_IES).toBe('1234567');
      });

      it('should handle MUNICIPIO as alternative to NO_MUNICIPIO_IES', () => {
        const columnMap = new Map([['MUNICIPIO', 0]]);
        const values = ['São Paulo'];

        const result = mapToMecRow(values, columnMap);

        expect(result.NO_MUNICIPIO_IES).toBe('São Paulo');
      });

      it('should handle UF as alternative to SG_UF_IES', () => {
        const columnMap = new Map([['UF', 0]]);
        const values = ['SP'];

        const result = mapToMecRow(values, columnMap);

        expect(result.SG_UF_IES).toBe('SP');
      });

      it('should handle CODIGO_CURSO as alternative to CO_CURSO', () => {
        const columnMap = new Map([['CODIGO_CURSO', 0]]);
        const values = ['999'];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_CURSO).toBe('999');
      });

      it('should handle NOME_CURSO as alternative to NO_CURSO', () => {
        const columnMap = new Map([['NOME_CURSO', 0]]);
        const values = ['Engenharia de Software'];

        const result = mapToMecRow(values, columnMap);

        expect(result.NO_CURSO).toBe('Engenharia de Software');
      });

      it('should handle GRAU as alternative to TP_GRAU', () => {
        const columnMap = new Map([['GRAU', 0]]);
        const values = ['Tecnólogo'];

        const result = mapToMecRow(values, columnMap);

        expect(result.TP_GRAU).toBe('Tecnólogo');
      });

      it('should handle MODALIDADE as alternative to TP_MODALIDADE', () => {
        const columnMap = new Map([['MODALIDADE', 0]]);
        const values = ['EaD'];

        const result = mapToMecRow(values, columnMap);

        expect(result.TP_MODALIDADE).toBe('EaD');
      });

      it('should handle AREA_OCDE_CINE as alternative', () => {
        const columnMap = new Map([['AREA_OCDE_CINE', 0]]);
        const values = ['Ciências Exatas'];

        const result = mapToMecRow(values, columnMap);

        expect(result.NO_CINE_AREA_GERAL).toBe('Ciências Exatas');
      });

      it('should handle CARGA_HORARIA as alternative', () => {
        const columnMap = new Map([['CARGA_HORARIA', 0]]);
        const values = ['4000'];

        const result = mapToMecRow(values, columnMap);

        expect(result.QT_CARGA_HORARIA).toBe('4000');
      });

      it('should handle SITUACAO_CURSO as alternative', () => {
        const columnMap = new Map([['SITUACAO_CURSO', 0]]);
        const values = ['Ativo'];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_SITUACAO).toBe('Ativo');
      });
    });

    describe('Edge Cases', () => {
      it('should return empty strings for missing columns', () => {
        const columnMap = new Map<string, number>();
        const values: string[] = [];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_IES).toBe('');
        expect(result.NO_IES).toBe('');
        expect(result.SG_IES).toBe('');
        expect(result.TP_ORGANIZACAO).toBe('');
        expect(result.TP_CATEGORIA).toBe('');
        expect(result.CO_MUNICIPIO_IES).toBe('');
        expect(result.NO_MUNICIPIO_IES).toBe('');
        expect(result.SG_UF_IES).toBe('');
        expect(result.CO_CURSO).toBe('');
        expect(result.NO_CURSO).toBe('');
        expect(result.TP_GRAU).toBe('');
        expect(result.TP_MODALIDADE).toBe('');
        expect(result.NO_CINE_AREA_GERAL).toBe('');
        expect(result.QT_CARGA_HORARIA).toBe('');
        expect(result.CO_SITUACAO).toBe('');
      });

      it('should handle partial column maps', () => {
        const columnMap = new Map([
          ['CO_IES', 0],
          ['NO_IES', 1],
        ]);
        const values = ['12345', 'Test University'];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_IES).toBe('12345');
        expect(result.NO_IES).toBe('Test University');
        expect(result.SG_IES).toBe(''); // Not in map
        expect(result.CO_CURSO).toBe(''); // Not in map
      });

      it('should handle values with special characters', () => {
        const columnMap = new Map([
          ['NO_IES', 0],
          ['NO_MUNICIPIO_IES', 1],
        ]);
        const values = [
          "Universidade São Paulo - USP (Campus Ribeirão Preto)",
          'Ribeirão Preto',
        ];

        const result = mapToMecRow(values, columnMap);

        expect(result.NO_IES).toBe(
          "Universidade São Paulo - USP (Campus Ribeirão Preto)",
        );
        expect(result.NO_MUNICIPIO_IES).toBe('Ribeirão Preto');
      });

      it('should prefer first alternative when multiple exist', () => {
        // Both CODIGO_IES and CO_IES present, prefer CODIGO_IES (first in fallback list)
        const columnMap = new Map([
          ['CODIGO_IES', 0],
          ['CO_IES', 1],
        ]);
        const values = ['first', 'second'];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_IES).toBe('first');
      });
    });

    describe('Real-world MEC Data', () => {
      it('should parse a typical federal university row', () => {
        const columnMap = new Map([
          ['CODIGO_IES', 0],
          ['NOME_IES', 1],
          ['SG_IES', 2],
          ['ORGANIZACAO_ACADEMICA', 3],
          ['CATEGORIA_ADMINISTRATIVA', 4],
          ['UF', 5],
          ['MUNICIPIO', 6],
          ['CODIGO_CURSO', 7],
          ['NOME_CURSO', 8],
          ['GRAU', 9],
          ['MODALIDADE', 10],
        ]);

        const values = [
          '1',
          'UNIVERSIDADE FEDERAL DO RIO DE JANEIRO',
          'UFRJ',
          'UNIVERSIDADE',
          'PÚBLICA FEDERAL',
          'RJ',
          'RIO DE JANEIRO',
          '116815',
          'CIÊNCIA DA COMPUTAÇÃO',
          'BACHARELADO',
          'PRESENCIAL',
        ];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_IES).toBe('1');
        expect(result.NO_IES).toBe('UNIVERSIDADE FEDERAL DO RIO DE JANEIRO');
        expect(result.SG_IES).toBe('UFRJ');
        expect(result.TP_ORGANIZACAO).toBe('UNIVERSIDADE');
        expect(result.TP_CATEGORIA).toBe('PÚBLICA FEDERAL');
        expect(result.SG_UF_IES).toBe('RJ');
        expect(result.NO_MUNICIPIO_IES).toBe('RIO DE JANEIRO');
        expect(result.CO_CURSO).toBe('116815');
        expect(result.NO_CURSO).toBe('CIÊNCIA DA COMPUTAÇÃO');
        expect(result.TP_GRAU).toBe('BACHARELADO');
        expect(result.TP_MODALIDADE).toBe('PRESENCIAL');
      });

      it('should parse a private EaD institution row', () => {
        const columnMap = new Map([
          ['CODIGO_IES', 0],
          ['NOME_IES', 1],
          ['ORGANIZACAO_ACADEMICA', 2],
          ['CATEGORIA_ADMINISTRATIVA', 3],
          ['CODIGO_CURSO', 4],
          ['NOME_CURSO', 5],
          ['MODALIDADE', 6],
        ]);

        const values = [
          '999',
          'FACULDADE DE TECNOLOGIA ONLINE',
          'FACULDADE',
          'PRIVADA COM FINS LUCRATIVOS',
          '50001',
          'ANÁLISE E DESENVOLVIMENTO DE SISTEMAS',
          'EAD',
        ];

        const result = mapToMecRow(values, columnMap);

        expect(result.CO_IES).toBe('999');
        expect(result.TP_ORGANIZACAO).toBe('FACULDADE');
        expect(result.TP_CATEGORIA).toBe('PRIVADA COM FINS LUCRATIVOS');
        expect(result.TP_MODALIDADE).toBe('EAD');
      });
    });
  });
});

