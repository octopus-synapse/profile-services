import {
  parseCsvLine,
  buildColumnMap,
  getColumnValue,
} from './csv-line.parser';

describe('CSV Line Parser', () => {
  describe('parseCsvLine', () => {
    describe('Basic Parsing', () => {
      it('should parse a simple CSV line', () => {
        const line = 'value1,value2,value3';
        const result = parseCsvLine(line);

        expect(result).toEqual(['value1', 'value2', 'value3']);
      });

      it('should handle empty values', () => {
        const line = 'value1,,value3';
        const result = parseCsvLine(line);

        expect(result).toEqual(['value1', '', 'value3']);
      });

      it('should handle trailing comma', () => {
        const line = 'value1,value2,';
        const result = parseCsvLine(line);

        expect(result).toEqual(['value1', 'value2', '']);
      });

      it('should handle leading comma', () => {
        const line = ',value1,value2';
        const result = parseCsvLine(line);

        expect(result).toEqual(['', 'value1', 'value2']);
      });

      it('should trim whitespace from values', () => {
        const line = '  value1  ,  value2  ,  value3  ';
        const result = parseCsvLine(line);

        expect(result).toEqual(['value1', 'value2', 'value3']);
      });
    });

    describe('Quoted Fields', () => {
      it('should handle quoted values', () => {
        const line = '"quoted value",normal,another';
        const result = parseCsvLine(line);

        expect(result).toEqual(['quoted value', 'normal', 'another']);
      });

      it('should handle commas inside quotes', () => {
        const line = '"value, with comma",normal,another';
        const result = parseCsvLine(line);

        expect(result).toEqual(['value, with comma', 'normal', 'another']);
      });

      it('should handle escaped quotes (double quotes)', () => {
        const line = '"value with ""quotes""",normal';
        const result = parseCsvLine(line);

        expect(result).toEqual(['value with "quotes"', 'normal']);
      });

      it('should handle multiple quoted fields', () => {
        const line = '"first, value","second, value","third"';
        const result = parseCsvLine(line);

        expect(result).toEqual(['first, value', 'second, value', 'third']);
      });

      it('should handle empty quoted value', () => {
        const line = '"",value,""';
        const result = parseCsvLine(line);

        expect(result).toEqual(['', 'value', '']);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty string', () => {
        const result = parseCsvLine('');

        expect(result).toEqual(['']);
      });

      it('should handle single value', () => {
        const result = parseCsvLine('single');

        expect(result).toEqual(['single']);
      });

      it('should handle only commas', () => {
        const result = parseCsvLine(',,,,');

        expect(result).toEqual(['', '', '', '', '']);
      });

      it('should handle newlines inside quotes', () => {
        // This tests the parser's handling, even if newlines should be escaped
        const line = '"value\nwith\nnewlines",normal';
        const result = parseCsvLine(line);

        expect(result[0]).toContain('\n');
      });

      it('should handle unicode characters', () => {
        const line = 'São Paulo,Universidade,Educação';
        const result = parseCsvLine(line);

        expect(result).toEqual(['São Paulo', 'Universidade', 'Educação']);
      });

      it('should handle special characters', () => {
        const line = 'value@test,value#hash,value$dollar';
        const result = parseCsvLine(line);

        expect(result).toEqual(['value@test', 'value#hash', 'value$dollar']);
      });
    });

    describe('MEC CSV Specific Cases', () => {
      it('should handle typical MEC institution row', () => {
        const line =
          '1,Universidade Federal do Rio de Janeiro,UFRJ,Universidade,Pública Federal,3304557,Rio de Janeiro,RJ';
        const result = parseCsvLine(line);

        expect(result).toHaveLength(8);
        expect(result[0]).toBe('1');
        expect(result[1]).toBe('Universidade Federal do Rio de Janeiro');
        expect(result[2]).toBe('UFRJ');
        expect(result[7]).toBe('RJ');
      });

      it('should handle quoted institution names with commas', () => {
        const line =
          '100,"Faculdade de Tecnologia, Ciências e Administração",FATEC,Faculdade,Privada';
        const result = parseCsvLine(line);

        expect(result[1]).toBe(
          'Faculdade de Tecnologia, Ciências e Administração',
        );
      });
    });
  });

  describe('buildColumnMap', () => {
    it('should build a map from header array', () => {
      const header = ['COL_A', 'COL_B', 'COL_C'];
      const map = buildColumnMap(header);

      expect(map.get('COL_A')).toBe(0);
      expect(map.get('COL_B')).toBe(1);
      expect(map.get('COL_C')).toBe(2);
    });

    it('should normalize column names to uppercase', () => {
      const header = ['col_a', 'Col_B', 'COL_C'];
      const map = buildColumnMap(header);

      expect(map.get('COL_A')).toBe(0);
      expect(map.get('COL_B')).toBe(1);
      expect(map.get('COL_C')).toBe(2);
    });

    it('should trim whitespace from column names', () => {
      const header = ['  COL_A  ', 'COL_B   ', '   COL_C'];
      const map = buildColumnMap(header);

      expect(map.get('COL_A')).toBe(0);
      expect(map.get('COL_B')).toBe(1);
      expect(map.get('COL_C')).toBe(2);
    });

    it('should remove BOM from first column', () => {
      const header = ['\uFEFFCOL_A', 'COL_B'];
      const map = buildColumnMap(header);

      expect(map.get('COL_A')).toBe(0);
      expect(map.get('COL_B')).toBe(1);
    });

    it('should handle empty header array', () => {
      const map = buildColumnMap([]);

      expect(map.size).toBe(0);
    });

    it('should handle MEC-style headers', () => {
      const header = [
        'CODIGO_IES',
        'NOME_IES',
        'SG_IES',
        'ORGANIZACAO_ACADEMICA',
        'CATEGORIA_ADMINISTRATIVA',
      ];
      const map = buildColumnMap(header);

      expect(map.get('CODIGO_IES')).toBe(0);
      expect(map.get('NOME_IES')).toBe(1);
      expect(map.get('ORGANIZACAO_ACADEMICA')).toBe(3);
    });
  });

  describe('getColumnValue', () => {
    let columnMap: Map<string, number>;
    let values: string[];

    beforeEach(() => {
      columnMap = new Map([
        ['CODIGO_IES', 0],
        ['CO_IES', 0],
        ['NOME_IES', 1],
        ['NO_IES', 1],
        ['SG_IES', 2],
      ]);
      values = ['12345', 'Universidade Federal', 'UF'];
    });

    it('should get value by first key match', () => {
      const result = getColumnValue(values, columnMap, 'CODIGO_IES');

      expect(result).toBe('12345');
    });

    it('should try fallback keys in order', () => {
      const result = getColumnValue(values, columnMap, 'NONEXISTENT', 'CO_IES');

      expect(result).toBe('12345');
    });

    it('should return empty string when no key matches', () => {
      const result = getColumnValue(
        values,
        columnMap,
        'NONEXISTENT1',
        'NONEXISTENT2',
      );

      expect(result).toBe('');
    });

    it('should return empty string when index is out of bounds', () => {
      const smallValues = ['only', 'two'];
      const bigMap = new Map([['COL_10', 10]]);

      const result = getColumnValue(smallValues, bigMap, 'COL_10');

      expect(result).toBe('');
    });

    it('should handle empty values array', () => {
      const result = getColumnValue([], columnMap, 'CODIGO_IES');

      expect(result).toBe('');
    });

    it('should handle multiple fallback keys', () => {
      const result = getColumnValue(
        values,
        columnMap,
        'INVALID1',
        'INVALID2',
        'INVALID3',
        'SG_IES',
      );

      expect(result).toBe('UF');
    });

    it('should prefer first matching key', () => {
      // Both CODIGO_IES and CO_IES map to index 0
      const result = getColumnValue(values, columnMap, 'CODIGO_IES', 'CO_IES');

      expect(result).toBe('12345');
    });
  });
});
